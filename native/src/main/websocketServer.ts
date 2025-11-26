import { WebSocketServer, WebSocket } from 'ws'

const PORT = 48125

let wss: WebSocketServer | null = null
const clients: Set<WebSocket> = new Set()
let connectionChangeCallback: (() => void) | null = null

export type MessageHandler = (message: { type: string; tabs?: unknown[] }) => void

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
    console.log('Extension connected')
    clients.add(ws)
    connectionChangeCallback?.()

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString())
        messageHandler(message)
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    })

    ws.on('close', () => {
      console.log('Extension disconnected')
      clients.delete(ws)
      connectionChangeCallback?.()
    })

    ws.on('error', (error) => {
      console.error('WebSocket error:', error)
      clients.delete(ws)
      connectionChangeCallback?.()
    })
  })

  wss.on('error', (error) => {
    console.error('WebSocket server error:', error)
  })
}

export function sendMessageToExtension(message: { type: string; tabId?: string }): void {
  const messageStr = JSON.stringify(message)
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr)
    }
  })
}

export function stopWebSocketServer(): void {
  if (wss) {
    wss.close()
    wss = null
    clients.clear()
    console.log('WebSocket server stopped')
  }
}

export function isExtensionConnected(): boolean {
  return clients.size > 0
}
