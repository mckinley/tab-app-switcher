import { Tab, BrowserType } from "@tas/types/tabs"
import { getFaviconDataUrl } from "./faviconCache"

const WS_URL = "ws://localhost:48125"
const INITIAL_RECONNECT_DELAY = 1000 // 1 second initial delay
const MAX_RECONNECT_DELAY = 60000 // 1 minute max delay
const UPDATE_DEBOUNCE = 100 // 100ms

let ws: WebSocket | null = null
let updateTimeout: ReturnType<typeof setTimeout> | null = null
let browserInstance: any = null
let getMruTabOrder: (() => number[]) | null = null
let updateMruOrderFn: ((tabId: number) => void) | null = null
let currentBrowserType: BrowserType = "unknown"
let currentReconnectDelay = INITIAL_RECONNECT_DELAY

/**
 * Detect which browser this extension is running in
 */
function detectBrowser(): BrowserType {
  const userAgent = navigator.userAgent.toLowerCase()

  // Check for Edge first since it also contains "chrome"
  if (userAgent.includes("edg/")) {
    return "edge"
  }
  // Firefox
  if (userAgent.includes("firefox")) {
    return "firefox"
  }
  // Safari (check before Chrome since Safari can include "chrome" in some contexts)
  if (userAgent.includes("safari") && !userAgent.includes("chrome")) {
    return "safari"
  }
  // Chrome (and Chromium-based browsers that aren't Edge)
  if (userAgent.includes("chrome")) {
    return "chrome"
  }

  return "unknown"
}

/**
 * Get tabs in MRU (Most Recently Used) order with favicon data URLs
 */
async function getTabsInMruOrder(): Promise<Tab[]> {
  if (!browserInstance) throw new Error("Browser instance not initialized")
  if (!getMruTabOrder) throw new Error("MRU getter not initialized")

  const mruTabOrder = getMruTabOrder()
  const browserTabs = await browserInstance.tabs.query({})

  // Convert tabs to our format and fetch favicon data URLs in parallel
  const tabPromises = browserTabs.map(async (tab: any) => {
    const faviconDataUrl = await getFaviconDataUrl(tab.favIconUrl || "")

    return {
      id: String(tab.id),
      title: tab.title || "Untitled",
      url: tab.url || "",
      favicon: faviconDataUrl,
      windowId: tab.windowId,
      index: tab.index,
      browser: currentBrowserType,
    } as Tab
  })

  const allTabs = await Promise.all(tabPromises)
  const tabsById = new Map(allTabs.map((tab) => [Number(tab.id), tab]))

  const tabsInMruOrder = mruTabOrder.map((id) => tabsById.get(id)).filter((tab): tab is Tab => tab !== undefined)

  return tabsInMruOrder
}

/**
 * Check if native app is connected
 */
export function isNativeAppConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN
}

/**
 * Notify native app that a specific tab was activated
 * This allows the native app to update its global MRU order across all browsers
 */
export function notifyTabActivated(tabId: number): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return

  console.log("Sending TAB_ACTIVATED to native app:", tabId)
  ws.send(JSON.stringify({ type: "TAB_ACTIVATED", tabId: String(tabId) }))
}

/**
 * Notify native app of tab updates (debounced)
 */
export function notifyNativeApp(): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return

  // Debounce updates to avoid flooding the native app
  if (updateTimeout) clearTimeout(updateTimeout)

  updateTimeout = setTimeout(() => {
    getTabsInMruOrder().then((tabs) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log("Sending TABS_UPDATED to native app:", tabs.length, "tabs")
        ws.send(JSON.stringify({ type: "TABS_UPDATED", tabs }))
      }
    })
  }, UPDATE_DEBOUNCE)
}

/**
 * Handle messages from native app
 */
function handleNativeMessage(message: any): void {
  if (!browserInstance) return

  console.log("Message from native app:", message)

  if (message.type === "GET_TABS") {
    // Native app is requesting fresh tab list
    getTabsInMruOrder().then((tabs) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log("Sending TABS_RESPONSE to native app:", tabs.length, "tabs")
        ws.send(JSON.stringify({ type: "TABS_RESPONSE", tabs }))
      }
    })
  } else if (message.type === "ACTIVATE_TAB") {
    const tabId = Number(message.tabId)
    browserInstance.tabs
      .update(tabId, { active: true })
      .then(() => browserInstance!.tabs.get(tabId))
      .then((tab: any) => {
        if (tab.windowId) {
          return browserInstance!.windows.update(tab.windowId, { focused: true })
        }
      })
      .then(() => {
        if (updateMruOrderFn) updateMruOrderFn(tabId)
      })
      .catch((error: any) => {
        console.error("Error activating tab:", error)
      })
  } else if (message.type === "CLOSE_TAB") {
    const tabId = Number(message.tabId)
    browserInstance.tabs.remove(tabId).catch((error: any) => {
      console.error("Error closing tab:", error)
    })
  }
}

/**
 * Connect to native app via WebSocket
 * @param browser - Browser API instance
 * @param getMruOrder - Getter function that returns current MRU tab order (avoids stale closures)
 * @param updateMruOrder - Function to update MRU order when tab is activated
 */
export function connectToNativeApp(
  browser: any,
  getMruOrder: () => number[],
  updateMruOrder: (tabId: number) => void,
): void {
  browserInstance = browser
  getMruTabOrder = getMruOrder
  updateMruOrderFn = updateMruOrder
  currentBrowserType = detectBrowser()
  console.log("Detected browser type:", currentBrowserType)

  let reconnectScheduled = false

  function scheduleReconnect(): void {
    if (reconnectScheduled) return
    reconnectScheduled = true

    console.log(`Scheduling reconnect in ${currentReconnectDelay / 1000}s...`)
    setTimeout(() => {
      reconnectScheduled = false
      // Exponential backoff: double the delay for next attempt, up to max
      currentReconnectDelay = Math.min(currentReconnectDelay * 2, MAX_RECONNECT_DELAY)
      attemptConnection()
    }, currentReconnectDelay)
  }

  function attemptConnection(): void {
    // Don't attempt if already connected or connecting
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      console.log("WebSocket already connected or connecting, skipping...")
      return
    }

    try {
      console.log("Connecting to native app via WebSocket...")

      ws = new WebSocket(WS_URL)

      ws.onopen = () => {
        console.log("Connected to native app")
        // Reset backoff delay on successful connection
        currentReconnectDelay = INITIAL_RECONNECT_DELAY
        // Send browser identification first
        ws!.send(JSON.stringify({ type: "BROWSER_IDENTIFY", browser: currentBrowserType }))
        // Then send initial tab list
        notifyNativeApp()
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleNativeMessage(message)
        } catch (error) {
          console.error("Error parsing message from native app:", error)
        }
      }

      ws.onclose = () => {
        console.log("Native app disconnected")
        ws = null
        scheduleReconnect()
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        // Close will usually fire after error, but ensure we clean up
        if (ws) {
          ws.close()
          ws = null
        }
        scheduleReconnect()
      }
    } catch (error) {
      console.error("Failed to connect to native app:", error)
      ws = null
      scheduleReconnect()
    }
  }

  attemptConnection()
}
