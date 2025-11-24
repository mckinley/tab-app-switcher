import type { Tab } from "@tas/types/tabs"
import { handleLogMessage } from "@tas/utils/logger"
import { connectToNativeApp, notifyNativeApp } from "../utils/nativeAppConnection"

/**
 * Background service worker for Tab Application Switcher
 * Tracks tabs in MRU (Most Recently Used) order
 */

// Store MRU order of tab IDs
let mruTabOrder: number[] = []

// Storage key for persisting MRU history
const MRU_STORAGE_KEY = "mruTabHistory"

// Maximum number of tab URLs to persist in history
const MAX_MRU_HISTORY = 20

/**
 * Persisted MRU history entry
 */
interface MruHistoryEntry {
  url: string
  lastAccessed: number
}

export default defineBackground(async () => {
  console.log("Tab Application Switcher background service started", { id: browser.runtime.id })

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

  // Listen for tab activation
  // This fires when user clicks on a tab or switches tabs via keyboard
  browser.tabs.onActivated.addListener((activeInfo) => {
    console.log("Tab activated:", activeInfo.tabId)
    updateMruOrder(activeInfo.tabId)
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
    }
  })

  // Listen for tab updates
  // When a tab becomes active (e.g., through tab.update API), update MRU
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Note: active state changes are better tracked via onActivated
    // This listener is mainly for other updates like URL changes
    if (tab.active && changeInfo.url) {
      // If the active tab's URL changed, ensure it's still at the front
      console.log("Active tab URL updated:", tabId)
      updateMruOrder(tabId)
    }
  })

  // Listen for tab removal
  browser.tabs.onRemoved.addListener((tabId) => {
    console.log("Tab removed:", tabId)
    removeFromMruOrder(tabId)
  })

  // Listen for tab replacement (rare, but can happen during certain browser operations)
  browser.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
    console.log("Tab replaced:", removedTabId, "->", addedTabId)
    // Replace the old tab ID with the new one in MRU order
    mruTabOrder = mruTabOrder.map((id) => (id === removedTabId ? addedTabId : id))
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

  // Connect to native app via WebSocket
  connectToNativeApp(browser, mruTabOrder, updateMruOrder)

  // Listen for tab changes and notify native app
  browser.tabs.onCreated.addListener(() => notifyNativeApp(mruTabOrder))
  browser.tabs.onRemoved.addListener(() => notifyNativeApp(mruTabOrder))
  browser.tabs.onUpdated.addListener(() => notifyNativeApp(mruTabOrder))
  browser.tabs.onActivated.addListener(() => notifyNativeApp(mruTabOrder))

  // Handle messages from popup
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "GET_TABS") {
      // Get all real browser tabs
      browser.tabs
        .query({})
        .then((browserTabs) => {
          // Convert to our Tab format and sort by MRU order
          const tabsById = new Map(
            browserTabs.map((tab) => [
              tab.id!,
              {
                id: String(tab.id),
                title: tab.title || "Untitled",
                url: tab.url || "",
                favicon: tab.favIconUrl || "",
                windowId: tab.windowId,
                index: tab.index,
              } as Tab,
            ]),
          )

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

    // Handle log messages from popup and other contexts
    if (handleLogMessage(message)) {
      return false // No response needed
    }

    return false
  })
})

/**
 * Update MRU order when a tab is activated
 */
function updateMruOrder(tabId: number) {
  // Remove tab from current position
  mruTabOrder = mruTabOrder.filter((id) => id !== tabId)
  // Add to front (most recently used)
  mruTabOrder.unshift(tabId)

  // Persist to storage (async, don't wait)
  saveMruHistory()
}

/**
 * Remove tab from MRU order when closed
 */
function removeFromMruOrder(tabId: number) {
  mruTabOrder = mruTabOrder.filter((id) => id !== tabId)

  // Persist to storage (async, don't wait)
  saveMruHistory()
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
