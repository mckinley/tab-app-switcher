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

import type { Browser } from "wxt/browser"
import type { BrowserTab, BrowserWindow, TabAugmentation, SnapshotPayload, EventPayload } from "@tas/types/protocol"
import { getFaviconDataUrl } from "./faviconCache"

export interface TabTrackerState {
  sessionTabs: Map<number, BrowserTab>
  sessionWindows: Map<number, BrowserWindow>
  augmentation: Map<number, TabAugmentation>
  currentlyActiveTabId: number | null
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

  // Lifecycle
  initialize(): Promise<SnapshotPayload>
  refresh(): Promise<SnapshotPayload>

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
export function createTabTracker(): TabTracker {
  const state: TabTrackerState = {
    sessionTabs: new Map(),
    sessionWindows: new Map(),
    augmentation: new Map(),
    currentlyActiveTabId: null,
  }

  const eventHandlers: Set<TabTrackerEventHandler> = new Set()

  function emit(event: EventPayload): void {
    eventHandlers.forEach((handler) => handler(event))
  }

  function updateAugmentationOnActivate(tabId: number): void {
    const now = Date.now()

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
      }
    },

    handleTabActivated(tabId, windowId) {
      updateAugmentationOnActivate(tabId)

      const event: EventPayload = {
        event: "tab.activated",
        tabId,
        windowId,
        timestamp: Date.now(),
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

      // Proactively cache favicon
      if (tab.favIconUrl) {
        getFaviconDataUrl(tab.favIconUrl).then((dataUrl) => {
          const aug = state.augmentation.get(tab.id!)
          if (aug) {
            aug.faviconDataUrl = dataUrl
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

      // Update favicon cache if it changed
      if (changes.favIconUrl) {
        getFaviconDataUrl(changes.favIconUrl).then((dataUrl) => {
          const aug = state.augmentation.get(tabId)
          if (aug) {
            aug.faviconDataUrl = dataUrl
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

    async initialize() {
      // Query all tabs and windows from browser
      const [tabs, windows] = await Promise.all([browser.tabs.query({}), browser.windows.getAll()])

      const now = Date.now()

      // Store raw data
      tabs.forEach((tab) => {
        if (tab.id !== undefined) {
          state.sessionTabs.set(tab.id, toBrowserTab(tab))

          // Initialize augmentation with browser's lastAccessed
          // Fallback to now if lastAccessed is not available
          state.augmentation.set(tab.id, {
            lastActivated: tab.lastAccessed ?? now,
          })

          // Track currently active tab
          if (tab.active) {
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

      // Preload favicons in background (don't await)
      Promise.all(
        tabs.map(async (tab) => {
          if (tab.id !== undefined && tab.favIconUrl) {
            const dataUrl = await getFaviconDataUrl(tab.favIconUrl)
            const aug = state.augmentation.get(tab.id)
            if (aug) {
              aug.faviconDataUrl = dataUrl
            }
          }
        }),
      )

      console.log(`[TAS] TabTracker initialized: ${state.sessionTabs.size} tabs, ${state.sessionWindows.size} windows`)

      return this.getSnapshot()
    },

    async refresh() {
      // Clear existing state
      state.sessionTabs.clear()
      state.sessionWindows.clear()
      state.augmentation.clear()
      state.currentlyActiveTabId = null

      // Re-initialize
      return this.initialize()
    },

    onEvent(handler) {
      eventHandlers.add(handler)
    },

    offEvent(handler) {
      eventHandlers.delete(handler)
    },
  }
}
