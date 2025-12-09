import type { Tab } from "@tas/types/tabs"
import { handleLogMessage } from "@tas/utils/logger"
import {
  connectToNativeApp,
  notifyNativeApp,
  notifyTabActivated,
  isNativeAppConnected,
} from "../utils/nativeAppConnection"
import { getFaviconDataUrl, preloadFavicons } from "../utils/faviconCache"

/**
 * Background service worker for Tab Application Switcher
 * Tracks tabs in MRU (Most Recently Used) order
 */

// Store MRU order of tab IDs
let mruTabOrder: number[] = []

// Timing maps for comparing different tracking approaches
// lastActivated: when TAS detected this tab gained focus (via onActivated or window focus change)
const tabLastActivated: Map<number, number> = new Map()
// lastDeactivated: when TAS detected this tab lost focus
const tabLastDeactivated: Map<number, number> = new Map()
// Track the currently active tab to know which tab to mark as deactivated
let currentlyActiveTabId: number | null = null

// Connected extension pages (popup, tabs page) for push updates
// Using ReturnType to extract the Port type from the listener parameter
type Port = Parameters<Parameters<typeof browser.runtime.onConnect.addListener>[0]>[0]
const connectedPorts: Set<Port> = new Set()

// Storage key for persisting MRU history
const MRU_STORAGE_KEY = "mruTabHistory"

// Maximum number of tab URLs to persist in history
const MAX_MRU_HISTORY = 20

// Debounce delay for saving MRU history (ms)
const MRU_SAVE_DEBOUNCE = 1000

// Debounce delay for broadcasting updates (ms)
const BROADCAST_DEBOUNCE = 50

// Timeout handles for debounced operations
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let broadcastTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Persisted MRU history entry
 */
interface MruHistoryEntry {
  url: string
  lastAccessed: number
}

export default defineBackground(() => {
  console.log("Tab Application Switcher background service started", { id: browser.runtime.id })

  // Open welcome page on first install
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      browser.tabs.create({ url: browser.runtime.getURL("/welcome.html") })
    }
  })

  // Initialize MRU order asynchronously (don't block background script startup)
  ;(async () => {
    // Load persisted MRU history from storage
    const storedHistory = await loadMruHistory()

    // Initialize MRU order with current tabs
    // Get all tabs across all windows
    const allTabs = await browser.tabs.query({})

    // Create a map of URL to tab for matching
    const urlToTab = new Map<string, (typeof allTabs)[0]>()
    allTabs.forEach((tab) => {
      if (tab.url) {
        urlToTab.set(tab.url, tab)
      }
    })

    // First, add tabs that match stored history (in history order)
    const matchedTabIds = new Set<number>()
    const initialMruOrder: number[] = []

    for (const entry of storedHistory) {
      const matchingTab = urlToTab.get(entry.url)
      if (matchingTab && matchingTab.id && !matchedTabIds.has(matchingTab.id)) {
        initialMruOrder.push(matchingTab.id)
        matchedTabIds.add(matchingTab.id)
      }
    }

    // Then add remaining tabs sorted by lastAccessed and active status
    const unmatchedTabs = allTabs
      .filter((tab) => tab.id && !matchedTabIds.has(tab.id))
      .sort((a, b) => {
        // Prioritize active tabs
        if (a.active && !b.active) return -1
        if (!a.active && b.active) return 1

        // Otherwise sort by lastAccessed
        const aTime = a.lastAccessed || 0
        const bTime = b.lastAccessed || 0
        return bTime - aTime
      })

    mruTabOrder = [...initialMruOrder, ...unmatchedTabs.map((tab) => tab.id!).filter((id) => id !== undefined)]

    console.log(
      "Initialized MRU order with",
      mruTabOrder.length,
      "tabs",
      `(${matchedTabIds.size} from history, ${unmatchedTabs.length} new)`,
    )

    // Save initial state to storage
    await saveMruHistory()

    // Preload all favicons so they're ready when the tab switcher opens
    const faviconUrls = allTabs.map((tab) => tab.favIconUrl).filter((url): url is string => !!url)
    preloadFavicons(faviconUrls)

    // Connect to native app after MRU order is initialized
    // Pass a getter function to avoid stale closure issues when mruTabOrder is reassigned
    connectToNativeApp(browser, () => mruTabOrder, updateMruOrder)
  })()

  // Listen for tab activation
  // This fires when user clicks on a tab or switches tabs via keyboard
  browser.tabs.onActivated.addListener((activeInfo) => {
    console.log("Tab activated:", activeInfo.tabId)
    updateMruOrder(activeInfo.tabId)
    notifyTabActivated(activeInfo.tabId)
    broadcastTabsUpdate()
  })

  // Listen for window focus changes
  // When a user switches to a different window, the active tab in that window should be moved to front
  browser.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === browser.windows.WINDOW_ID_NONE) {
      // Browser lost focus, no action needed
      return
    }

    try {
      // Get the active tab in the focused window
      const tabs = await browser.tabs.query({ active: true, windowId })
      if (tabs.length > 0 && tabs[0].id) {
        console.log("Window focused, active tab:", tabs[0].id)
        updateMruOrder(tabs[0].id)
        notifyTabActivated(tabs[0].id)
        broadcastTabsUpdate()
      }
    } catch (error) {
      console.error("Error handling window focus change:", error)
    }
  })

  // Listen for tab creation
  // New tabs should be added to MRU order when created
  browser.tabs.onCreated.addListener((tab) => {
    if (tab.id) {
      console.log("Tab created:", tab.id)
      // Add to front of MRU if it's active, otherwise add to end
      if (tab.active) {
        updateMruOrder(tab.id)
      } else {
        // Add to end of MRU order
        mruTabOrder = [...mruTabOrder.filter((id) => id !== tab.id), tab.id]
      }
      // Proactively cache favicon
      if (tab.favIconUrl) {
        getFaviconDataUrl(tab.favIconUrl)
      }
    }
    broadcastTabsUpdate()
  })

  // Listen for tab updates
  // Cache favicon when it changes, update MRU on URL change
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Proactively cache new favicon
    if (changeInfo.favIconUrl) {
      getFaviconDataUrl(changeInfo.favIconUrl)
    }

    // Note: active state changes are better tracked via onActivated
    // This listener is mainly for other updates like URL changes
    if (tab.active && changeInfo.url) {
      // If the active tab's URL changed, ensure it's still at the front
      console.log("Active tab URL updated:", tabId)
      updateMruOrder(tabId)
    }
    broadcastTabsUpdate()
  })

  // Listen for tab removal
  browser.tabs.onRemoved.addListener((tabId) => {
    console.log("Tab removed:", tabId)
    removeFromMruOrder(tabId)
    broadcastTabsUpdate()
  })

  // Listen for tab replacement (rare, but can happen during certain browser operations)
  browser.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
    console.log("Tab replaced:", removedTabId, "->", addedTabId)
    // Replace the old tab ID with the new one in MRU order
    mruTabOrder = mruTabOrder.map((id) => (id === removedTabId ? addedTabId : id))
    broadcastTabsUpdate()
  })

  // Listen for keyboard commands
  // Note: Stateless approach - we try to advance selection first, and if that fails (popup not open),
  // we open the popup. Alternative: use browser.runtime.connect() with port.onDisconnect for better performance.
  browser.commands.onCommand.addListener(async (command) => {
    if (command === "tas_activate") {
      console.log("TAS activate command received")

      // Try to advance selection in existing popup
      try {
        await browser.runtime.sendMessage({
          type: "ADVANCE_SELECTION",
          direction: "next",
        })
        console.log("Advanced selection - popup was open")
      } catch (_error) {
        // Popup not open, so open it
        console.log("Opening TAS popup - popup was closed")
        try {
          await browser.action.openPopup()
        } catch (openError) {
          console.log("Error opening popup:", openError, "Opening fallback window...")
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

  // Handle messages from popup
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "GET_TABS") {
      // Get all real browser tabs
      browser.tabs
        .query({})
        .then(async (browserTabs) => {
          // Convert to our Tab format with favicon data URLs
          const tabPromises = browserTabs.map(async (tab) => {
            const faviconDataUrl = await getFaviconDataUrl(tab.favIconUrl || "")
            const tabId = tab.id!

            return {
              id: String(tabId),
              title: tab.title || "Untitled",
              url: tab.url || "",
              favicon: faviconDataUrl,
              windowId: tab.windowId,
              index: tab.index,
              // All timing fields for comparison
              lastAccessed: tab.lastAccessed, // Chrome's built-in
              lastActivated: tabLastActivated.get(tabId), // Our tracking (gained focus)
              lastDeactivated: tabLastDeactivated.get(tabId), // Our tracking (lost focus)
              // Deprecated but kept for backward compatibility
              lastActiveTime: tabLastActivated.get(tabId) ?? tab.lastAccessed,
            } as Tab
          })

          const allTabs = await Promise.all(tabPromises)
          const tabsById = new Map(allTabs.map((tab) => [Number(tab.id), tab]))

          // Return tabs in MRU order, filtering out any that no longer exist
          const tabsInMruOrder = mruTabOrder
            .map((id) => tabsById.get(id))
            .filter((tab): tab is Tab => tab !== undefined)

          sendResponse({ tabs: tabsInMruOrder })
        })
        .catch((error) => {
          console.error("Error getting tabs:", error)
          sendResponse({ tabs: [] })
        })

      return true // Will respond asynchronously
    }

    if (message.type === "ACTIVATE_TAB") {
      const tabId = Number(message.tabId)
      browser.tabs
        .update(tabId, { active: true })
        .then(() => {
          // Get the window of this tab and focus it
          return browser.tabs.get(tabId)
        })
        .then((tab) => {
          if (tab.windowId) {
            return browser.windows.update(tab.windowId, { focused: true })
          }
        })
        .then(() => {
          updateMruOrder(tabId)
          sendResponse({ success: true })
        })
        .catch((error) => {
          console.error("Error activating tab:", error)
          sendResponse({ success: false, error: error.message })
        })

      return true // Will respond asynchronously
    }

    if (message.type === "CLOSE_TAB") {
      const tabId = Number(message.tabId)
      browser.tabs
        .remove(tabId)
        .then(() => {
          removeFromMruOrder(tabId)
          sendResponse({ success: true })
        })
        .catch((error) => {
          console.error("Error closing tab:", error)
          sendResponse({ success: false, error: error.message })
        })

      return true // Will respond asynchronously
    }

    if (message.type === "CHECK_NATIVE_APP") {
      sendResponse({ connected: isNativeAppConnected() })
      return false
    }

    // Handle log messages from popup and other contexts
    if (handleLogMessage(message)) {
      return false // No response needed
    }

    return false
  })

  // Handle port connections from extension pages for push updates
  browser.runtime.onConnect.addListener((port) => {
    console.log("Extension page connected:", port.name)
    connectedPorts.add(port)

    // Send initial tabs immediately
    getTabsInMruOrder().then((tabs) => {
      try {
        port.postMessage({ type: "TABS_UPDATED", tabs })
      } catch {
        connectedPorts.delete(port)
      }
    })

    port.onDisconnect.addListener(() => {
      console.log("Extension page disconnected:", port.name)
      connectedPorts.delete(port)
    })
  })
})

/**
 * Update MRU order when a tab is activated
 */
function updateMruOrder(tabId: number) {
  const now = Date.now()

  // Mark the previously active tab as deactivated
  if (currentlyActiveTabId !== null && currentlyActiveTabId !== tabId) {
    tabLastDeactivated.set(currentlyActiveTabId, now)
  }

  // Remove tab from current position
  mruTabOrder = mruTabOrder.filter((id) => id !== tabId)
  // Add to front (most recently used)
  mruTabOrder.unshift(tabId)

  // Track the exact timestamp when this tab was activated
  tabLastActivated.set(tabId, now)

  // Update the currently active tab
  currentlyActiveTabId = tabId

  // Persist to storage (debounced to avoid excessive writes during rapid switching)
  saveMruHistoryDebounced()
}

/**
 * Remove tab from MRU order when closed
 */
function removeFromMruOrder(tabId: number) {
  mruTabOrder = mruTabOrder.filter((id) => id !== tabId)
  tabLastActivated.delete(tabId)
  tabLastDeactivated.delete(tabId)

  // If the closed tab was the currently active one, clear it
  if (currentlyActiveTabId === tabId) {
    currentlyActiveTabId = null
  }

  // Persist to storage (debounced)
  saveMruHistoryDebounced()
}

/**
 * Debounced wrapper for saveMruHistory to prevent excessive storage writes
 */
function saveMruHistoryDebounced() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveMruHistory()
  }, MRU_SAVE_DEBOUNCE)
}

/**
 * Load MRU history from browser storage
 */
async function loadMruHistory(): Promise<MruHistoryEntry[]> {
  try {
    const result = await browser.storage.local.get(MRU_STORAGE_KEY)
    const history = result[MRU_STORAGE_KEY] as MruHistoryEntry[] | undefined

    if (Array.isArray(history)) {
      console.log("Loaded MRU history:", history.length, "entries")
      return history
    }
  } catch (error) {
    console.error("Error loading MRU history:", error)
  }

  return []
}

/**
 * Save current MRU order to browser storage
 * Only stores URLs and timestamps for the most recent tabs
 */
async function saveMruHistory(): Promise<void> {
  try {
    // Get the top N tabs in MRU order
    const topMruTabIds = mruTabOrder.slice(0, MAX_MRU_HISTORY)

    // Query browser for these tabs to get their URLs
    const tabs = await browser.tabs.query({})
    const tabsById = new Map(tabs.map((tab) => [tab.id!, tab]))

    // Build history entries
    const history: MruHistoryEntry[] = []
    const now = Date.now()

    for (let i = 0; i < topMruTabIds.length; i++) {
      const tabId = topMruTabIds[i]
      const tab = tabsById.get(tabId)

      if (tab && tab.url) {
        // Store URL and approximate timestamp (newer = higher priority)
        // Using index to preserve order since actual lastAccessed might not reflect MRU
        history.push({
          url: tab.url,
          lastAccessed: now - i * 1000, // Each position is 1 second apart
        })
      }
    }

    await browser.storage.local.set({ [MRU_STORAGE_KEY]: history })
    console.log("Saved MRU history:", history.length, "entries")
  } catch (error) {
    console.error("Error saving MRU history:", error)
  }
}

/**
 * Get all tabs in MRU order with full Tab data
 */
async function getTabsInMruOrder(): Promise<Tab[]> {
  const browserTabs = await browser.tabs.query({})

  const tabPromises = browserTabs.map(async (tab) => {
    const faviconDataUrl = await getFaviconDataUrl(tab.favIconUrl || "")
    const tabId = tab.id!
    return {
      id: String(tabId),
      title: tab.title || "Untitled",
      url: tab.url || "",
      favicon: faviconDataUrl,
      windowId: tab.windowId,
      index: tab.index,
      // All timing fields for comparison
      lastAccessed: tab.lastAccessed,
      lastActivated: tabLastActivated.get(tabId),
      lastDeactivated: tabLastDeactivated.get(tabId),
      lastActiveTime: tabLastActivated.get(tabId) ?? tab.lastAccessed,
    } as Tab
  })

  const allTabs = await Promise.all(tabPromises)
  const tabsById = new Map(allTabs.map((tab) => [Number(tab.id), tab]))

  return mruTabOrder.map((id) => tabsById.get(id)).filter((tab): tab is Tab => tab !== undefined)
}

/**
 * Broadcast tabs update to all connected extension pages and native app
 * Debounced to avoid flooding during rapid tab changes
 */
function broadcastTabsUpdate(): void {
  if (broadcastTimeout) clearTimeout(broadcastTimeout)

  broadcastTimeout = setTimeout(async () => {
    const tabs = await getTabsInMruOrder()
    const message = { type: "TABS_UPDATED", tabs }

    // Send to all connected extension pages
    connectedPorts.forEach((port) => {
      try {
        port.postMessage(message)
      } catch {
        connectedPorts.delete(port)
      }
    })

    // Also notify native app
    notifyNativeApp()
  }, BROADCAST_DEBOUNCE)
}
