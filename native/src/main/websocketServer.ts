import { WebSocketServer, WebSocket } from 'ws'
import type { BrowserType } from '@tas/types/tabs'

const PORT = 48125

let wss: WebSocketServer | null = null
// Map of browser type to WebSocket connection
const browserClients: Map<BrowserType, WebSocket> = new Map()
let connectionChangeCallback: (() => void) | null = null

export type MessageHandler = (message: {
  type: string
  tabs?: unknown[]
  tabId?: string
  browser?: BrowserType
}) => void

export function startWebSocketServer(
  messageHandler: MessageHandler,
  onConnectionChange?: () => void
): void {
  if (wss) {
    console.log('WebSocket server already running')
    return
  }

  connectionChangeCallback = onConnectionChange || null

  wss = new WebSocketServer({ port: PORT })

  wss.on('listening', () => {
    console.log(`WebSocket server listening on port ${PORT}`)
  })

  wss.on('connection', (ws: WebSocket) => {
    console.log('Extension connected (awaiting browser identification)')

    // Temporary storage for unidentified connection
    let identifiedBrowser: BrowserType | null = null

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString())
        console.log(
          `Received message type: ${message.type}, browser in msg: ${message.browser}, identified: ${identifiedBrowser}`
        )

        // Handle browser identification message
        if (message.type === 'BROWSER_IDENTIFY' && message.browser) {
          identifiedBrowser = message.browser as BrowserType
          browserClients.set(identifiedBrowser, ws)
          console.log(`Browser identified: ${identifiedBrowser}`)
          connectionChangeCallback?.()
          return
        }

        // Attach browser info to message for handler
        if (identifiedBrowser) {
          message.browser = identifiedBrowser
        } else {
          console.log(`WARNING: Message received before browser identification!`)
        }
        messageHandler(message)
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    })

    ws.on('close', () => {
      if (identifiedBrowser) {
        console.log(`${identifiedBrowser} extension disconnected`)
        browserClients.delete(identifiedBrowser)
      } else {
        console.log('Unidentified extension disconnected')
      }
      connectionChangeCallback?.()
    })

    ws.on('error', (error) => {
      console.error('WebSocket error:', error)
      if (identifiedBrowser) {
        browserClients.delete(identifiedBrowser)
      }
      connectionChangeCallback?.()
    })
  })

  wss.on('error', (error) => {
    console.error('WebSocket server error:', error)
  })
}

// Send message to a specific browser's extension
export function sendMessageToBrowser(
  browser: BrowserType,
  message: { type: string; tabId?: string }
): void {
  const client = browserClients.get(browser)
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message))
  }
}

// Send message to all connected extensions
export function sendMessageToAllExtensions(message: { type: string; tabId?: string }): void {
  const messageStr = JSON.stringify(message)
  browserClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr)
    }
  })
}

export function stopWebSocketServer(): void {
  if (wss) {
    wss.close()
    wss = null
    browserClients.clear()
    console.log('WebSocket server stopped')
  }
}

export function isExtensionConnected(): boolean {
  return browserClients.size > 0
}

export function getConnectedBrowsers(): BrowserType[] {
  return Array.from(browserClients.keys())
}
