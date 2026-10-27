/**
 * Tab Tracker Module
 *
 * Pure module for managing tab state in the browser extension.
 * Responsibilities:
 * - Track sessionTabs (raw browser.tabs.Tab[])
 * - Track sessionWindows (raw browser.windows.Window[])
 * - Track augmentation (lastActivated, lastDeactivated, faviconDataUrl)
 * - Generate snapshots for the native app
 * - Generate events for incremental updates
 *
 * This module has NO WebSocket concerns - it just manages state.
 * Sorting is done at display time using tas/sorting/.
 */

import { browser, type Browser } from "wxt/browser"
import type {
  BrowserTab,
  BrowserWindow,
  TabAugmentation,
  SnapshotPayload,
  EventPayload,
  SessionTab,
  DeviceSession,
  TabPosition,
} from "@tas/types/protocol"
import { getFaviconDataUrl } from "./faviconCache"

export interface TabTrackerState {
  sessionTabs: Map<number, BrowserTab>
  sessionWindows: Map<number, BrowserWindow>
  augmentation: Map<number, TabAugmentation>
  currentlyActiveTabId: number | null
  recentlyClosed: SessionTab[]
  otherDevices: DeviceSession[]
}

export type TabTrackerEventHandler = (event: EventPayload) => void

export interface TabTracker {
  // State access
  getState(): TabTrackerState
  getSnapshot(): SnapshotPayload

  // Event handlers (call these from browser event listeners)
  // Each returns the event that should be sent to native app
  handleTabActivated(tabId: number, windowId: number): EventPayload
  handleTabCreated(tab: Browser.tabs.Tab): EventPayload
  handleTabRemoved(tabId: number, windowId: number): EventPayload
  handleTabUpdated(tabId: number, changes: Browser.tabs.OnUpdatedInfo, tab: Browser.tabs.Tab): EventPayload | null
  handleWindowFocused(windowId: number): EventPayload | null
  handleWindowCreated(window: Browser.windows.Window): EventPayload
  handleWindowRemoved(windowId: number): EventPayload
  /** A tab was swapped for another (prerendering): it keeps its place in the order */
  handleTabReplaced(addedTab: Browser.tabs.Tab, removedTabId: number): void
  /**
   * Re-read the window and position of every tab in these windows, after tabs moved, opened or
   * closed. Returns whether any tab moved.
   */
  syncTabPositions(windowIds: number[]): Promise<boolean>

  // Lifecycle
  initialize(): Promise<SnapshotPayload>
  refresh(): Promise<SnapshotPayload>
  /** Re-read recently closed tabs and other devices (call when browser.sessions changes) */
  refreshSessions(): Promise<void>

  // Event subscription
  onEvent(handler: TabTrackerEventHandler): void
  offEvent(handler: TabTrackerEventHandler): void
}

/**
 * Convert a browser.tabs.Tab to our BrowserTab type
 * (they're essentially the same, but this ensures type safety)
 */
function toBrowserTab(tab: Browser.tabs.Tab): BrowserTab {
  return {
    id: tab.id,
    index: tab.index,
    windowId: tab.windowId,
    openerTabId: tab.openerTabId,
    highlighted: tab.highlighted,
    active: tab.active,
    pinned: tab.pinned,
    audible: tab.audible,
    discarded: tab.discarded,
    autoDiscardable: tab.autoDiscardable,
    mutedInfo: tab.mutedInfo,
    url: tab.url,
    pendingUrl: tab.pendingUrl,
    title: tab.title,
    favIconUrl: tab.favIconUrl,
    status: tab.status as BrowserTab["status"],
    incognito: tab.incognito,
    width: tab.width,
    height: tab.height,
    sessionId: tab.sessionId,
    groupId: tab.groupId,
    lastAccessed: tab.lastAccessed,
  }
}

/**
 * Convert a browser.windows.Window to our BrowserWindow type
 */
function toBrowserWindow(win: Browser.windows.Window): BrowserWindow {
  return {
    id: win.id,
    focused: win.focused,
    top: win.top,
    left: win.left,
    width: win.width,
    height: win.height,
    incognito: win.incognito,
    type: win.type as BrowserWindow["type"],
    state: win.state as BrowserWindow["state"],
    alwaysOnTop: win.alwaysOnTop,
    sessionId: win.sessionId,
  }
}

/**
 * Create a new TabTracker instance
 */
/**
 * Session timestamps in seconds. Chrome reports `lastModified` in seconds and Firefox in
 * milliseconds, so anything too large to be seconds is converted.
 */
function toSeconds(lastModified: number): number {
  return lastModified > 1e11 ? Math.floor(lastModified / 1000) : lastModified
}

/**
 * Call an optional browser.sessions method. Safari has no sessions API and Firefox doesn't
 * support getDevices, and neither list is essential, so a missing or failing call gives [].
 */
async function readSessionsList<T>(name: string, call: (() => Promise<T[]>) | undefined): Promise<T[]> {
  if (!call) return []
  try {
    return (await call()) ?? []
  } catch (error) {
    console.warn(`[TAS] sessions.${name} failed; leaving it out`, error)
    return []
  }
}

async function readRecentlyClosed(): Promise<SessionTab[]> {
  const sessions = browser.sessions as Partial<typeof browser.sessions> | undefined
  const recentlyClosed = await readSessionsList(
    "getRecentlyClosed",
    sessions?.getRecentlyClosed && (() => sessions.getRecentlyClosed!({ maxResults: 10 })),
  )
  return recentlyClosed
    .filter((session) => session.tab) // Only tabs, not windows
    .map((session) => ({
      sessionId: session.tab!.sessionId!,
      title: session.tab!.title ?? "Untitled",
      url: session.tab!.url ?? "",
      favIconUrl: session.tab!.favIconUrl,
      lastModified: toSeconds(session.lastModified),
    }))
}

async function readOtherDevices(): Promise<DeviceSession[]> {
  const sessions = browser.sessions as Partial<typeof browser.sessions> | undefined
  const devices = await readSessionsList(
    "getDevices",
    sessions?.getDevices && (() => sessions.getDevices!({ maxResults: 5 })),
  )
  // Sessions can have either .tab or .window - we need to extract tabs from both
  return devices.map((device) => {
    const deviceTabs: SessionTab[] = []

    device.sessions.forEach((session) => {
      if (session.tab) {
        // Direct tab session
        deviceTabs.push({
          sessionId: session.tab.sessionId ?? `device-tab-${deviceTabs.length}`,
          title: session.tab.title ?? "Untitled",
          url: session.tab.url ?? "",
          favIconUrl: session.tab.favIconUrl,
          lastModified: toSeconds(session.lastModified),
        })
      } else if (session.window?.tabs) {
        // Window session with tabs inside
        session.window.tabs.forEach((tab) => {
          deviceTabs.push({
            sessionId: tab.sessionId ?? `device-tab-${deviceTabs.length}`,
            title: tab.title ?? "Untitled",
            url: tab.url ?? "",
            favIconUrl: tab.favIconUrl,
            lastModified: toSeconds(session.lastModified),
          })
        })
      }
    })

    return {
      deviceName: device.deviceName,
      tabs: deviceTabs.slice(0, 10), // Limit tabs per device
    }
  })
}

// When each tab was last activated and left, kept in session storage so the order survives
// the service worker being stopped and restarted (the browser clears it on restart, when
// tab ids change anyway). Favicons aren't kept; they're re-read.
const ACTIVITY_KEY = "tasTabActivity"
type TabActivity = Record<string, { lastActivated?: number; lastDeactivated?: number }>

async function readActivity(): Promise<TabActivity> {
  try {
    const stored = await browser.storage?.session?.get(ACTIVITY_KEY)
    return (stored?.[ACTIVITY_KEY] as TabActivity | undefined) ?? {}
  } catch {
    return {}
  }
}

export function createTabTracker(): TabTracker {
  const state: TabTrackerState = {
    sessionTabs: new Map(),
    sessionWindows: new Map(),
    augmentation: new Map(),
    currentlyActiveTabId: null,
    recentlyClosed: [],
    otherDevices: [],
  }

  const eventHandlers: Set<TabTrackerEventHandler> = new Set()

  function emit(event: EventPayload): void {
    eventHandlers.forEach((handler) => handler(event))
  }

  function saveActivity(): void {
    const activity: TabActivity = {}
    state.augmentation.forEach(({ lastActivated, lastDeactivated }, tabId) => {
      if (state.sessionTabs.has(tabId)) activity[tabId] = { lastActivated, lastDeactivated }
    })
    browser.storage?.session?.set({ [ACTIVITY_KEY]: activity })?.catch(() => {})
  }

  function updateAugmentationOnActivate(tabId: number, now = Date.now()): void {
    // Mark previous tab as deactivated
    if (state.currentlyActiveTabId !== null && state.currentlyActiveTabId !== tabId) {
      const prevAug = state.augmentation.get(state.currentlyActiveTabId)
      if (prevAug) {
        prevAug.lastDeactivated = now
      } else {
        state.augmentation.set(state.currentlyActiveTabId, { lastDeactivated: now })
      }
    }

    // Update augmentation for newly activated tab
    let aug = state.augmentation.get(tabId)
    if (!aug) {
      aug = {}
      state.augmentation.set(tabId, aug)
    }
    aug.lastActivated = now

    state.currentlyActiveTabId = tabId
    saveActivity()
  }

  return {
    getState: () => state,

    getSnapshot: () => {
      // Convert Maps to arrays/objects for the snapshot
      const sessionTabs = Array.from(state.sessionTabs.values())
      const sessionWindows = Array.from(state.sessionWindows.values())
      const augmentation: Record<string, TabAugmentation> = {}

      state.augmentation.forEach((aug, tabId) => {
        augmentation[String(tabId)] = aug
      })

      return {
        sessionTabs,
        sessionWindows,
        augmentation,
        recentlyClosed: state.recentlyClosed,
        otherDevices: state.otherDevices,
      }
    },

    handleTabActivated(tabId, windowId) {
      const now = Date.now()
      updateAugmentationOnActivate(tabId, now)
      // The browser's own lastAccessed moves too, which the "Last accessed" order uses
      const tab = state.sessionTabs.get(tabId)
      if (tab) tab.lastAccessed = now

      const event: EventPayload = {
        event: "tab.activated",
        tabId,
        windowId,
        timestamp: now,
      }
      emit(event)
      return event
    },

    handleTabCreated(tab) {
      if (tab.id === undefined) {
        throw new Error("Tab created without ID")
      }

      const browserTab = toBrowserTab(tab)
      state.sessionTabs.set(tab.id, browserTab)

      // Initialize augmentation
      state.augmentation.set(tab.id, {
        lastActivated: tab.active ? Date.now() : tab.lastAccessed,
      })

      // If it's active, update the active tab tracking
      if (tab.active) {
        updateAugmentationOnActivate(tab.id)
      }

      // Proactively cache favicon and emit augmentation update when ready
      if (tab.favIconUrl) {
        getFaviconDataUrl(tab.favIconUrl).then((dataUrl) => {
          const aug = state.augmentation.get(tab.id!)
          if (aug) {
            aug.faviconDataUrl = dataUrl
            // Emit augmentation update for the favicon
            emit({
              event: "augmentation.updated",
              tabId: tab.id!,
              augmentation: { faviconDataUrl: dataUrl },
            })
          }
        })
      }

      const event: EventPayload = {
        event: "tab.created",
        tab: browserTab,
      }
      emit(event)
      return event
    },

    handleTabRemoved(tabId, windowId) {
      state.sessionTabs.delete(tabId)
      state.augmentation.delete(tabId)

      if (state.currentlyActiveTabId === tabId) {
        state.currentlyActiveTabId = null
      }

      const event: EventPayload = {
        event: "tab.removed",
        tabId,
        windowId,
      }
      emit(event)
      return event
    },

    handleTabUpdated(tabId, changes, tab) {
      const existing = state.sessionTabs.get(tabId)
      if (!existing) {
        // Tab not tracked yet, ignore
        return null
      }

      // Update our stored tab
      const updatedTab = toBrowserTab(tab)
      state.sessionTabs.set(tabId, updatedTab)

      // Update favicon cache if it changed and emit augmentation update when ready
      if (changes.favIconUrl) {
        getFaviconDataUrl(changes.favIconUrl).then((dataUrl) => {
          const aug = state.augmentation.get(tabId)
          if (aug) {
            aug.faviconDataUrl = dataUrl
            // Emit augmentation update for the favicon
            emit({
              event: "augmentation.updated",
              tabId,
              augmentation: { faviconDataUrl: dataUrl },
            })
          }
        })
      }

      // Only send event if there are meaningful changes
      // (not just loading state changes)
      const meaningfulChanges = changes.url || changes.title || changes.favIconUrl || changes.pinned
      if (!meaningfulChanges) {
        return null
      }

      const event: EventPayload = {
        event: "tab.updated",
        tabId,
        changes: changes as Partial<BrowserTab>,
      }
      emit(event)
      return event
    },

    handleWindowFocused(windowId) {
      if (windowId === browser.windows.WINDOW_ID_NONE) {
        // Browser lost focus, no action needed
        return null
      }

      // Update the window's focused state
      state.sessionWindows.forEach((win, id) => {
        if (id === windowId) {
          win.focused = true
        } else {
          win.focused = false
        }
      })

      const event: EventPayload = {
        event: "window.focused",
        windowId,
      }
      emit(event)
      return event
    },

    handleWindowCreated(window) {
      if (window.id === undefined) {
        throw new Error("Window created without ID")
      }

      const browserWindow = toBrowserWindow(window)
      state.sessionWindows.set(window.id, browserWindow)

      const event: EventPayload = {
        event: "window.created",
        window: browserWindow,
      }
      emit(event)
      return event
    },

    handleWindowRemoved(windowId) {
      state.sessionWindows.delete(windowId)

      const event: EventPayload = {
        event: "window.removed",
        windowId,
      }
      emit(event)
      return event
    },

    handleTabReplaced(addedTab, removedTabId) {
      const removed = state.sessionTabs.get(removedTabId)
      const { lastActivated, lastDeactivated } = state.augmentation.get(removedTabId) ?? {}
      if (removed) this.handleTabRemoved(removedTabId, removed.windowId)
      if (addedTab.id === undefined) return
      this.handleTabCreated(addedTab)
      const aug = state.augmentation.get(addedTab.id)
      if (!aug || addedTab.active) return
      aug.lastActivated = lastActivated ?? aug.lastActivated
      aug.lastDeactivated = lastDeactivated
      emit({ event: "augmentation.updated", tabId: addedTab.id, augmentation: { lastActivated, lastDeactivated } })
    },

    async syncTabPositions(windowIds) {
      const ids = [...new Set(windowIds)].filter((id) => id !== browser.windows.WINDOW_ID_NONE)
      const windows = await Promise.all(ids.map((windowId) => browser.tabs.query({ windowId }).catch(() => [])))

      const moved: TabPosition[] = []
      windows.flat().forEach((tab) => {
        const stored = tab.id === undefined ? undefined : state.sessionTabs.get(tab.id)
        if (!stored || (stored.index === tab.index && stored.windowId === tab.windowId)) return
        stored.index = tab.index
        stored.windowId = tab.windowId
        moved.push({ tabId: tab.id!, windowId: tab.windowId, index: tab.index })
      })
      if (moved.length === 0) return false
      emit({ event: "tabs.moved", tabs: moved })
      return true
    },

    async initialize() {
      // Query all tabs, windows, recently closed, and other devices from browser
      const [tabs, windows, recentlyClosed, otherDevices, activity] = await Promise.all([
        browser.tabs.query({}),
        browser.windows.getAll(),
        readRecentlyClosed(),
        readOtherDevices(),
        readActivity(),
      ])

      const now = Date.now()

      // Find the focused window
      const focusedWindow = windows.find((win) => win.focused)
      const focusedWindowId = focusedWindow?.id

      tabs.forEach((tab) => {
        if (tab.id !== undefined) {
          state.sessionTabs.set(tab.id, toBrowserTab(tab))

          // What this worker recorded before it was stopped, else the browser's lastAccessed
          const saved = activity[tab.id]
          state.augmentation.set(tab.id, {
            lastActivated: saved?.lastActivated ?? tab.lastAccessed ?? now,
            lastDeactivated: saved?.lastDeactivated,
          })

          // Track currently active tab (only in the focused window)
          if (tab.active && tab.windowId === focusedWindowId) {
            state.currentlyActiveTabId = tab.id
          }
        }
      })

      // Set the currently active tab's lastActivated to now so it appears at the top
      if (state.currentlyActiveTabId !== null) {
        const activeAug = state.augmentation.get(state.currentlyActiveTabId)
        if (activeAug) {
          activeAug.lastActivated = now
        }
      }

      windows.forEach((win) => {
        if (win.id !== undefined) {
          state.sessionWindows.set(win.id, toBrowserWindow(win))
        }
      })

      // Preload favicons in background and emit augmentation updates when ready
      Promise.all(
        tabs.map(async (tab) => {
          if (tab.id !== undefined && tab.favIconUrl) {
            const dataUrl = await getFaviconDataUrl(tab.favIconUrl)
            const aug = state.augmentation.get(tab.id)
            if (aug) {
              aug.faviconDataUrl = dataUrl
              emit({
                event: "augmentation.updated",
                tabId: tab.id,
                augmentation: { faviconDataUrl: dataUrl },
              })
            }
          }
        }),
      )

      state.recentlyClosed = recentlyClosed
      state.otherDevices = otherDevices

      console.log(
        `[TAS] TabTracker initialized: ${state.sessionTabs.size} tabs, ${state.sessionWindows.size} windows, ${state.recentlyClosed.length} recently closed, ${state.otherDevices.length} devices`,
      )

      return this.getSnapshot()
    },

    async refresh() {
      // Clear existing state
      state.sessionTabs.clear()
      state.sessionWindows.clear()
      state.augmentation.clear()
      state.currentlyActiveTabId = null
      state.recentlyClosed = []
      state.otherDevices = []

      // Re-initialize
      return this.initialize()
    },

    async refreshSessions() {
      const [recentlyClosed, otherDevices] = await Promise.all([readRecentlyClosed(), readOtherDevices()])
      state.recentlyClosed = recentlyClosed
      state.otherDevices = otherDevices
    },

    onEvent(handler) {
      eventHandlers.add(handler)
    },

    offEvent(handler) {
      eventHandlers.delete(handler)
    },
  }
}
