import { Tab } from "@tas/types/tabs"
import { getFaviconDataUrl } from "./faviconCache"

const WS_URL = "ws://localhost:48125"
const RECONNECT_DELAY = 5000 // 5 seconds
const UPDATE_DEBOUNCE = 100 // 100ms

let ws: WebSocket | null = null
let updateTimeout: ReturnType<typeof setTimeout> | null = null
let browserInstance: any = null

/**
 * Get tabs in MRU (Most Recently Used) order with favicon data URLs
 */
async function getTabsInMruOrder(mruTabOrder: number[]): Promise<Tab[]> {
  if (!browserInstance) throw new Error("Browser instance not initialized")

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
 * Notify native app of tab updates (debounced)
 */
export function notifyNativeApp(mruTabOrder: number[]): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return

  // Debounce updates to avoid flooding the native app
  if (updateTimeout) clearTimeout(updateTimeout)

  updateTimeout = setTimeout(() => {
    getTabsInMruOrder(mruTabOrder).then((tabs) => {
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
function handleNativeMessage(message: any, mruTabOrder: number[], updateMruOrder: (tabId: number) => void): void {
  if (!browserInstance) return

  console.log("Message from native app:", message)

  if (message.type === "GET_TABS") {
    // Native app is requesting fresh tab list
    getTabsInMruOrder(mruTabOrder).then((tabs) => {
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
        updateMruOrder(tabId)
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
 */
export function connectToNativeApp(browser: any, mruTabOrder: number[], updateMruOrder: (tabId: number) => void): void {
  browserInstance = browser

  try {
    console.log("Connecting to native app via WebSocket...")

    ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      console.log("Connected to native app")
      // Send initial tab list
      notifyNativeApp(mruTabOrder)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleNativeMessage(message, mruTabOrder, updateMruOrder)
      } catch (error) {
        console.error("Error parsing message from native app:", error)
      }
    }

    ws.onclose = () => {
      console.log("Native app disconnected")
      ws = null
      // Try to reconnect after delay
      setTimeout(() => connectToNativeApp(browser, mruTabOrder, updateMruOrder), RECONNECT_DELAY)
    }

    ws.onerror = (error) => {
      console.error("WebSocket error:", error)
    }
  } catch (error) {
    console.error("Failed to connect to native app:", error)
    // Try to reconnect after delay
    setTimeout(() => connectToNativeApp(browser, mruTabOrder, updateMruOrder), RECONNECT_DELAY)
  }
}
