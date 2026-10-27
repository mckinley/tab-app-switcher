/**
 * Background Service Worker for Tab Application Switcher
 *
 * This is the main entry point for the extension. It:
 * - Initializes the TabTracker for state management
 * - Initializes the NativeAppTransport for communication with the native app
 * - Wires up browser event listeners
 * - Handles commands from the native app
 * - Manages popup/port communication
 */

import type { Tab } from "@tas/types/tabs"
import type { CommandPayload } from "@tas/types/protocol"
import {
  sortTabsWithSections,
  sortOrderToStrategy,
  strategyToSortOrder,
  type SortStrategy,
  type SortOrder,
} from "@tas/sorting"
import { handleLogMessage } from "@tas/utils/logger"
import { createTabTracker, type TabTracker } from "../utils/tabTracker"
import { createNativeAppTransport, type NativeAppTransport } from "../utils/nativeAppConnection"
import { getFaviconDataUrl } from "../utils/faviconCache"
import { activateTab, createWindowWithUrls, moveTab, openSwitcherTab, restoreSession } from "../utils/tabActions"
import { finishSignInFromPage } from "../utils/auth"

// Connected extension pages (popup, tabs page) for push updates
type Port = Parameters<Parameters<typeof browser.runtime.onConnect.addListener>[0]>[0]
const connectedPorts: Set<Port> = new Set()

// Module state
let tabTracker: TabTracker | null = null
let transport: NativeAppTransport | null = null
// Settles once the tracker has read the browser's tabs. The shortcut can wake this worker and
// open the popup before then, and the popup should get the whole list, not an empty one.
let tabTrackerReady: Promise<unknown> = Promise.resolve()

// Where the popup's selection starts the next time it opens (set when the shortcut reopens it)
let popupStartIndex: number | null = null
// Whether the shortcut that opened the popup was pressed outside this profile's windows
let popupOpenedFromElsewhere = false

// Debounce for broadcasting updates to extension pages
const BROADCAST_DEBOUNCE = 50
let broadcastTimeout: ReturnType<typeof setTimeout> | null = null

export default defineBackground(() => {
  console.log("[TAS] Background service worker started", { id: browser.runtime.id })

  // Open welcome page on first install
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      browser.tabs.create({ url: browser.runtime.getURL("/welcome.html") })
    }
  })

  // Initialize asynchronously
  ;(async () => {
    // Create and initialize TabTracker. Keep going if reading the browser's state fails, so
    // the native app connection still starts and later tab events still arrive.
    tabTracker = createTabTracker()
    tabTrackerReady = tabTracker.initialize()
    try {
      await tabTrackerReady
    } catch (error) {
      console.error("[TAS] Failed to read tabs at startup:", error)
    }

    // Create and connect NativeAppTransport (it forwards tabTracker events itself)
    transport = await createNativeAppTransport(tabTracker)

    // Handle commands from native app
    transport.onCommand(handleCommand)

    // Start connection
    transport.connect()

    console.log("[TAS] Initialization complete")
  })()

  // ============================================================================
  // Browser Event Listeners
  // ============================================================================

  // Tab activated (user clicks/switches to tab)
  browser.tabs.onActivated.addListener((activeInfo) => {
    if (!tabTracker) return
    tabTracker.handleTabActivated(activeInfo.tabId, activeInfo.windowId)
    broadcastTabsUpdate()
  })

  // Window focus changed
  browser.windows.onFocusChanged.addListener(async (windowId) => {
    if (!tabTracker) return
    if (windowId === browser.windows.WINDOW_ID_NONE) return

    tabTracker.handleWindowFocused(windowId)

    // Also update the active tab in that window
    try {
      const tabs = await browser.tabs.query({ active: true, windowId })
      if (tabs.length > 0 && tabs[0].id) {
        tabTracker.handleTabActivated(tabs[0].id, windowId)
        broadcastTabsUpdate()
      }
    } catch (error) {
      console.error("[TAS] Error handling window focus change:", error)
    }
  })

  // Tab created
  browser.tabs.onCreated.addListener((tab) => {
    if (!tabTracker || tab.id === undefined) return
    tabTracker.handleTabCreated(tab)
    broadcastTabsUpdate()
    // Tabs after it in its window moved along one
    syncTabPositions([tab.windowId])
  })

  // Tab updated (URL, title, favicon changes)
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!tabTracker) return
    tabTracker.handleTabUpdated(tabId, changeInfo, tab)

    // Only broadcast for meaningful changes
    if (changeInfo.url || changeInfo.title || changeInfo.favIconUrl) {
      broadcastTabsUpdate()
    }
  })

  // Tab removed
  browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (!tabTracker) return
    tabTracker.handleTabRemoved(tabId, removeInfo.windowId)
    broadcastTabsUpdate()
    if (!removeInfo.isWindowClosing) syncTabPositions([removeInfo.windowId])
  })

  // Tab replaced by another (prerendering): the new one takes its place
  browser.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
    browser.tabs
      .get(addedTabId)
      .then((tab) => {
        tabTracker?.handleTabReplaced(tab, removedTabId)
        broadcastTabsUpdate()
      })
      .catch((error) => console.error("[TAS] Error handling a replaced tab:", error))
  })

  // Tabs dragged to a new position, or out of one window and into another
  browser.tabs.onMoved.addListener((_tabId, moveInfo) => syncTabPositions([moveInfo.windowId]))
  browser.tabs.onDetached.addListener((_tabId, detachInfo) => syncTabPositions([detachInfo.oldWindowId]))
  browser.tabs.onAttached.addListener((_tabId, attachInfo) => syncTabPositions([attachInfo.newWindowId]))

  // Window created
  browser.windows.onCreated.addListener((window) => {
    if (!tabTracker || window.id === undefined) return
    tabTracker.handleWindowCreated(window)
  })

  // Window removed
  browser.windows.onRemoved.addListener((windowId) => {
    if (!tabTracker) return
    tabTracker.handleWindowRemoved(windowId)
  })

  // Recently closed tabs or other devices changed (Safari has no sessions API)
  browser.sessions?.onChanged?.addListener(async () => {
    if (!tabTracker) return
    await tabTracker.refreshSessions()
    broadcastTabsUpdate()
    if (transport?.isConnected()) {
      transport.sendSnapshot(tabTracker.getSnapshot())
    }
  })

  // Storage changed - broadcast when sort order changes
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.sortOrder) {
      broadcastTabsUpdate()
    }
  })

  // ============================================================================
  // Keyboard Commands
  // ============================================================================

  browser.commands.onCommand.addListener(async (command) => {
    if (command !== "tas_activate") return

    // If the popup is already open, move its selection
    const advanced = (await browser.runtime
      .sendMessage({ type: "ADVANCE_SELECTION", direction: "next" })
      .catch(() => undefined)) as { selectedIndex?: number } | undefined

    if (typeof advanced?.selectedIndex !== "number") {
      popupStartIndex = null
      // A shortcut set to "In Chrome" only fires while one of this profile's windows is focused,
      // so if none is, it's set to "Global" and was pressed in another profile or app.
      popupOpenedFromElsewhere = !(await browser.windows.getLastFocused().then(
        (w) => w.focused,
        () => true,
      ))
      await openSwitcherPopup()
      return
    }

    // With Chrome's default "In Chrome" shortcut scope, once a shortcut press reaches the open
    // popup, Chrome drops that page's key-up events until another key goes down, so letting go
    // of Alt would do nothing. A freshly opened popup does see the release, so reopen it with
    // the new selection. (The "Global" scope doesn't have this problem, but only one Chrome
    // profile can own a global shortcut, so it breaks Alt+Tab in every other profile.)
    if (await isToolbarPopupOpen()) {
      popupStartIndex = advanced.selectedIndex
      await browser.runtime.sendMessage({ type: "CLOSE_POPUP" }).catch(() => {})
      await reopenToolbarPopup()
    }
  })

  // ============================================================================
  // Message Handling (from popup and other extension pages)
  // ============================================================================

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_TABS") {
      getTabsForDisplay().then((tabs) => {
        sendResponse({ tabs })
      })
      return true // Will respond asynchronously
    }

    if (message.type === "ACTIVATE_TAB") {
      openSwitcherTab(String(message.tabId))
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }))
      return true
    }

    if (message.type === "CLOSE_TAB") {
      const tabId = Number(message.tabId)
      // Recently Closed and Other Devices rows aren't open tabs
      if (Number.isNaN(tabId)) {
        sendResponse({ success: false, error: "Not an open tab" })
        return false
      }
      closeTab(tabId)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }))
      return true
    }

    if (message.type === "REFRESH_TABS") {
      refreshTabs()
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }))
      return true
    }

    if (message.type === "POPUP_OPENED") {
      sendResponse({ startIndex: popupStartIndex, openedFromElsewhere: popupOpenedFromElsewhere })
      popupStartIndex = null
      return false
    }

    // Safari's sign-in tab reached the site's done page (signin.content.ts). Go by the tab's
    // own URL, and close it once signed in; Tab Management sees the new token.
    if (message.type === "SIGN_IN_PAGE_DONE") {
      finishSignInFromPage(sender.url ?? "")
        .then((signedIn) => {
          if (signedIn && sender.tab?.id !== undefined) browser.tabs.remove(sender.tab.id)
        })
        .catch((error) => console.error("[TAS] Sign-in failed:", error))
      return false
    }

    if (message.type === "CHECK_NATIVE_APP") {
      sendResponse({ connected: transport?.isConnected() ?? false })
      return false
    }

    // Handle log messages from popup and other contexts
    if (handleLogMessage(message)) {
      return false
    }

    return false
  })

  // ============================================================================
  // Port Connections (for push updates to extension pages)
  // ============================================================================

  browser.runtime.onConnect.addListener((port) => {
    connectedPorts.add(port)

    // Send initial tabs immediately
    getTabsForDisplay().then((tabs) => {
      try {
        port.postMessage({ type: "TABS_UPDATED", tabs })
      } catch {
        connectedPorts.delete(port)
      }
    })

    port.onDisconnect.addListener(() => {
      connectedPorts.delete(port)
    })
  })
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Handle commands from the native app
 */
function handleCommand(command: CommandPayload): void {
  switch (command.command) {
    // The tab may have closed since the app last heard about it
    case "activateTab":
      activateTab(command.tabId).catch((error) => console.error("[TAS] Couldn't switch to tab:", error))
      break
    case "closeTab":
      closeTab(command.tabId).catch((error) => console.error("[TAS] Couldn't close tab:", error))
      break
    case "requestSnapshot":
      if (tabTracker && transport) {
        const snapshot = tabTracker.getSnapshot()
        transport.sendSnapshot(snapshot)
      }
      break
    case "refresh":
      refreshTabs()
      break
    case "setSortStrategy": {
      // Native app is syncing sort strategy to this extension
      const uiSortOrder = strategyToSortOrder[command.strategy]
      browser.storage.local.set({ sortOrder: uiSortOrder })
      // Storage change listener will trigger broadcastTabsUpdate()
      break
    }
    // Optional commands, listed in the connect payload (nativeAppConnection.ts)
    case "restoreSession":
      restoreSession(command.sessionId).catch((error) => console.error("[TAS] Couldn't restore session:", error))
      break
    case "moveTab":
      moveTab(command.tabId, command.index, command.windowId).catch((error) =>
        console.error("[TAS] Couldn't move tab:", error),
      )
      break
    case "createWindow":
      createWindowWithUrls(command.urls).catch((error) => console.error("[TAS] Couldn't open window:", error))
      break
  }
}

/**
 * Re-read where the tabs in these windows are (Tab Management lists them in tab-strip order)
 */
function syncTabPositions(windowIds: number[]): void {
  tabTracker
    ?.syncTabPositions(windowIds)
    .then((moved) => {
      if (moved) broadcastTabsUpdate()
    })
    .catch((error) => console.error("[TAS] Error reading tab positions:", error))
}

/**
 * Refresh tabs: clear state and re-query all tabs from browser API
 */
async function refreshTabs(): Promise<void> {
  if (!tabTracker) return

  await tabTracker.refresh()

  // Send new snapshot to native app
  if (transport?.isConnected()) {
    const snapshot = tabTracker.getSnapshot()
    transport.sendSnapshot(snapshot)
  }

  // Broadcast to popup and other extension pages
  broadcastTabsUpdate()
}

/**
 * Open the switcher: the toolbar popup where the browser allows it, else a small popup window
 */
async function openSwitcherPopup(): Promise<void> {
  // MV2 builds (Firefox, Safari) have browserAction instead of action
  const action = browser.action ?? (browser as unknown as { browserAction?: typeof browser.action }).browserAction
  try {
    await action.openPopup()
  } catch (_openError) {
    // Fallback: open as a popup window, which closes itself when it loses focus
    const popupUrl = browser.runtime.getURL("/popup.html?mode=window")
    await browser.windows.create({
      url: popupUrl,
      type: "popup",
      width: 360,
      height: 480,
    })
  }
}

/**
 * Whether the switcher is open as the toolbar popup (not the fallback popup window)
 */
async function isToolbarPopupOpen(): Promise<boolean> {
  if (!browser.runtime.getContexts) return false
  const contexts = await browser.runtime.getContexts({ contextTypes: [browser.runtime.ContextType.POPUP] })
  return contexts.length > 0
}

/**
 * Reopen the toolbar popup right after it closed. Chrome only opens it once the browser
 * window is active again, which takes a moment, so retry briefly.
 */
async function reopenToolbarPopup(): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      await browser.action.openPopup()
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 15))
    }
  }
  popupStartIndex = null
}

/**
 * Close a tab
 */
async function closeTab(tabId: number): Promise<void> {
  await browser.tabs.remove(tabId)
  // TabTracker will be updated via onRemoved listener
}

/**
 * Get the user's sort strategy from storage
 */
async function getSortStrategy(): Promise<SortStrategy> {
  const result = await browser.storage.local.get("sortOrder")
  const sortOrder = result.sortOrder as SortOrder | undefined
  return sortOrder ? (sortOrderToStrategy[sortOrder] ?? "lastActivated") : "lastActivated"
}

/**
 * Get tabs formatted for display (sorted, with favicons, with sections)
 */
async function getTabsForDisplay(): Promise<Tab[]> {
  await tabTrackerReady.catch(() => {})
  if (!tabTracker) return []

  const snapshot = tabTracker.getSnapshot()

  // Get user's sort preference and apply it
  const strategy = await getSortStrategy()
  const sortedTabs = sortTabsWithSections({
    sessionTabs: snapshot.sessionTabs,
    sessionWindows: snapshot.sessionWindows,
    augmentation: snapshot.augmentation,
    recentlyClosed: snapshot.recentlyClosed,
    otherDevices: snapshot.otherDevices,
    strategy,
  })

  // Ensure favicons are loaded (they should be cached by TabTracker)
  const tabsWithFavicons = await Promise.all(
    sortedTabs.map(async (tab: Tab) => {
      // If favicon is missing, try to fetch it (only for regular tabs, not session tabs)
      if (!tab.favicon && !tab.sessionId) {
        const browserTab = snapshot.sessionTabs.find((t) => String(t.id) === tab.id)
        if (browserTab?.favIconUrl) {
          tab.favicon = await getFaviconDataUrl(browserTab.favIconUrl)
        }
      }
      return tab
    }),
  )

  return tabsWithFavicons
}

/**
 * Broadcast tabs update to all connected extension pages
 */
function broadcastTabsUpdate(): void {
  if (broadcastTimeout) clearTimeout(broadcastTimeout)

  broadcastTimeout = setTimeout(async () => {
    const tabs = await getTabsForDisplay()
    const message = { type: "TABS_UPDATED", tabs }

    connectedPorts.forEach((port) => {
      try {
        port.postMessage(message)
      } catch {
        connectedPorts.delete(port)
      }
    })
  }, BROADCAST_DEBOUNCE)
}
