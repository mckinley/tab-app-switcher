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

// Connected extension pages (popup, tabs page) for push updates
type Port = Parameters<Parameters<typeof browser.runtime.onConnect.addListener>[0]>[0]
const connectedPorts: Set<Port> = new Set()

// Module state
let tabTracker: TabTracker | null = null
let transport: NativeAppTransport | null = null

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
    // Create and initialize TabTracker
    tabTracker = createTabTracker()
    await tabTracker.initialize()

    // Create and connect NativeAppTransport
    transport = await createNativeAppTransport(tabTracker)

    // Handle commands from native app
    transport.onCommand(handleCommand)

    // Forward tab events to native app
    tabTracker.onEvent((event) => {
      if (transport?.isConnected()) {
        transport.sendEvent(event)
      }
    })

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
  })

  // Tab replaced (rare, during certain browser operations)
  browser.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
    if (!tabTracker) return
    // Handle as remove + create
    const state = tabTracker.getState()
    const oldTab = state.sessionTabs.get(removedTabId)
    if (oldTab) {
      tabTracker.handleTabRemoved(removedTabId, oldTab.windowId)
    }
    // The new tab will be picked up by onCreated or we need to query it
    browser.tabs.get(addedTabId).then((tab) => {
      if (tab) {
        tabTracker!.handleTabCreated(tab)
      }
    })
    broadcastTabsUpdate()
  })

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
    if (command === "tas_activate") {
      // Try to advance selection in existing popup
      try {
        await browser.runtime.sendMessage({
          type: "ADVANCE_SELECTION",
          direction: "next",
        })
      } catch (_error) {
        // Popup not open, so open it
        try {
          await browser.action.openPopup()
        } catch (_openError) {
          // Fallback: open as a popup window
          const popupUrl = browser.runtime.getURL("/popup.html")
          await browser.windows.create({
            url: popupUrl,
            type: "popup",
            width: 360,
            height: 480,
          })
        }
      }
    }
  })

  // ============================================================================
  // Message Handling (from popup and other extension pages)
  // ============================================================================

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "GET_TABS") {
      getTabsForDisplay().then((tabs) => {
        sendResponse({ tabs })
      })
      return true // Will respond asynchronously
    }

    if (message.type === "ACTIVATE_TAB") {
      const tabId = Number(message.tabId)
      activateTab(tabId)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }))
      return true
    }

    if (message.type === "CLOSE_TAB") {
      const tabId = Number(message.tabId)
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
    case "activateTab":
      activateTab(command.tabId)
      break
    case "closeTab":
      closeTab(command.tabId)
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
  }
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
 * Activate a tab and its window
 */
async function activateTab(tabId: number): Promise<void> {
  await browser.tabs.update(tabId, { active: true })
  const tab = await browser.tabs.get(tabId)
  if (tab.windowId) {
    await browser.windows.update(tab.windowId, { focused: true })
  }
  // TabTracker will be updated via onActivated listener
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
