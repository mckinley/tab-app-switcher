/**
 * WebSocket Server for Tab Application Switcher
 *
 * Handles communication with browser extensions using the v1 protocol.
 * Sessions are keyed by (instanceId, runtimeSessionId) to support:
 * - Multiple browser profiles simultaneously
 * - Reconnection after MV3 service worker restarts
 * - Clean session separation on browser restarts
 */

import { WebSocketServer, WebSocket } from 'ws'
import type { BrowserType } from '@tas/types/tabs'
import type { SortStrategy } from '@tas/sorting'
import {
  type ProtocolEnvelope,
  type ConnectPayload,
  type ConnectedPayload,
  type EventPayload,
  type CommandPayload,
  type BrowserTab,
  type BrowserWindow,
  type TabAugmentation,
  type SessionTab,
  type DeviceSession,
  createEnvelope,
  isValidEnvelope,
  isConnectPayload,
  isSnapshotPayload,
  isEventPayload
} from '@tas/types/protocol'

const PORT = 48125
const SERVER_VERSION = '2.0.0'

// Session key: instanceId:runtimeSessionId
export type SessionKey = string

/**
 * Connection state for a single WebSocket connection
 */
export interface ConnectionState {
  connectionId: string
  ws: WebSocket
  lastSeenSeq: number
  connectedAt: number
}

/**
 * Session state for a browser instance
 * A session can have multiple connections (reconnects)
 */
export interface Session {
  instanceId: string
  runtimeSessionId: string
  browserType: BrowserType
  extensionVersion: string
  sortStrategy?: SortStrategy // Extension's current sort strategy
  hasSnapshot: boolean
  lastSnapshotSeq: number
  sessionTabs: BrowserTab[]
  sessionWindows: BrowserWindow[]
  augmentation: Map<string, TabAugmentation>
  recentlyClosed: SessionTab[]
  otherDevices: DeviceSession[]
  connections: Map<string, ConnectionState>
  createdAt: number
  lastActivity: number
}

// Sessions keyed by instanceId:runtimeSessionId
const sessions: Map<SessionKey, Session> = new Map()

// Reverse lookup: WebSocket -> { sessionKey, connectionId }
const wsToSession: Map<WebSocket, { sessionKey: SessionKey; connectionId: string }> = new Map()

let wss: WebSocketServer | null = null
let connectionChangeCallback: (() => void) | null = null
let snapshotCallback: ((sessionKey: SessionKey, session: Session) => void) | null = null
let eventCallback:
  | ((sessionKey: SessionKey, session: Session, event: EventPayload) => void)
  | null = null

function makeSessionKey(instanceId: string, runtimeSessionId: string): SessionKey {
  return `${instanceId}:${runtimeSessionId}`
}

function sendToWs<T>(ws: WebSocket, envelope: ProtocolEnvelope<T>): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(envelope))
  }
}

/**
 * Start the WebSocket server
 */
export function startWebSocketServer(options?: {
  onConnectionChange?: () => void
  onSnapshot?: (sessionKey: SessionKey, session: Session) => void
  onEvent?: (sessionKey: SessionKey, session: Session, event: EventPayload) => void
}): void {
  if (wss) {
    console.log('[TAS Server] WebSocket server already running')
    return
  }

  connectionChangeCallback = options?.onConnectionChange || null
  snapshotCallback = options?.onSnapshot || null
  eventCallback = options?.onEvent || null

  wss = new WebSocketServer({ port: PORT })

  wss.on('listening', () => {
    console.log(`[TAS Server] WebSocket server listening on port ${PORT}`)
  })

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString())

        if (!isValidEnvelope(msg)) {
          console.warn(
            '[TAS Server] Invalid envelope received:',
            JSON.stringify(msg).substring(0, 200)
          )
          return
        }

        const envelope = msg as ProtocolEnvelope
        handleMessage(ws, envelope)
      } catch (error) {
        console.error('[TAS Server] Error parsing message:', error)
      }
    })

    ws.on('close', () => {
      handleDisconnect(ws)
    })

    ws.on('error', (error) => {
      console.error('[TAS Server] WebSocket error:', error)
      handleDisconnect(ws)
    })
  })

  wss.on('error', (error) => {
    console.error('[TAS Server] Server error:', error)
  })
}

/**
 * Handle an incoming message
 */
function handleMessage(ws: WebSocket, envelope: ProtocolEnvelope): void {
  const { instanceId, runtimeSessionId, connectionId, type, seq } = envelope
  const sessionKey = makeSessionKey(instanceId, runtimeSessionId)

  // Handle connect (handshake)
  if (type === 'connect') {
    if (!isConnectPayload(envelope.payload)) {
      console.warn('[TAS Server] Invalid connect payload')
      return
    }

    const payload = envelope.payload
    handleConnect(ws, sessionKey, instanceId, runtimeSessionId, connectionId, payload)
    return
  }

  // For all other messages, session must exist
  const session = sessions.get(sessionKey)
  if (!session) {
    console.warn(`[TAS Server] Message from unknown session: ${sessionKey.substring(0, 16)}...`)
    return
  }

  // Update last seen seq and activity
  const conn = session.connections.get(connectionId)
  if (conn) {
    conn.lastSeenSeq = seq
  }
  session.lastActivity = Date.now()

  switch (type) {
    case 'snapshot':
      handleSnapshot(sessionKey, session, envelope)
      break

    case 'event':
      handleEvent(sessionKey, session, envelope)
      break

    case 'ping': {
      // Respond with pong
      const pongEnvelope = createEnvelope('pong', instanceId, runtimeSessionId, connectionId, 0, {})
      sendToWs(ws, pongEnvelope)
      break
    }

    case 'pong':
      // Heartbeat acknowledged, no action needed
      break

    default:
      console.log(`[TAS Server] Unhandled message type: ${type}`)
  }
}

/**
 * Handle connect (handshake) message
 */
function handleConnect(
  ws: WebSocket,
  sessionKey: SessionKey,
  instanceId: string,
  runtimeSessionId: string,
  connectionId: string,
  payload: ConnectPayload
): void {
  // Get or create session
  let session = sessions.get(sessionKey)
  const isNewSession = !session

  if (!session) {
    session = {
      instanceId,
      runtimeSessionId,
      browserType: payload.browserType,
      extensionVersion: payload.extensionVersion,
      sortStrategy: payload.sortStrategy,
      hasSnapshot: false,
      lastSnapshotSeq: -1,
      sessionTabs: [],
      sessionWindows: [],
      augmentation: new Map(),
      recentlyClosed: [],
      otherDevices: [],
      connections: new Map(),
      createdAt: Date.now(),
      lastActivity: Date.now()
    }
    sessions.set(sessionKey, session)
  } else {
    // Update metadata (extension might have been updated)
    session.extensionVersion = payload.extensionVersion
    session.sortStrategy = payload.sortStrategy
    session.lastActivity = Date.now()
  }

  // Add this connection
  session.connections.set(connectionId, {
    connectionId,
    ws,
    lastSeenSeq: 0,
    connectedAt: Date.now()
  })

  // Track reverse lookup
  wsToSession.set(ws, { sessionKey, connectionId })

  // Send connected response
  const response = createEnvelope<ConnectedPayload>(
    'connected',
    instanceId,
    runtimeSessionId,
    connectionId,
    0,
    { ok: true, serverVersion: SERVER_VERSION }
  )
  sendToWs(ws, response)

  console.log(
    `[TAS Server] Session ${isNewSession ? 'created' : 'reconnected'}: ` +
      `${payload.browserType} (${sessionKey.substring(0, 16)}...)`
  )

  connectionChangeCallback?.()
}

/**
 * Handle snapshot message
 */
function handleSnapshot(
  sessionKey: SessionKey,
  session: Session,
  envelope: ProtocolEnvelope
): void {
  if (!isSnapshotPayload(envelope.payload)) {
    console.warn('[TAS Server] Invalid snapshot payload')
    return
  }

  const snapshot = envelope.payload

  // Replace session state
  session.sessionTabs = snapshot.sessionTabs
  session.sessionWindows = snapshot.sessionWindows
  session.augmentation = new Map(Object.entries(snapshot.augmentation))
  session.recentlyClosed = snapshot.recentlyClosed ?? []
  session.otherDevices = snapshot.otherDevices ?? []
  session.hasSnapshot = true
  session.lastSnapshotSeq = envelope.seq

  snapshotCallback?.(sessionKey, session)
}

/**
 * Handle event message
 */
function handleEvent(sessionKey: SessionKey, session: Session, envelope: ProtocolEnvelope): void {
  // Ignore events before snapshot
  if (!session.hasSnapshot) {
    return
  }

  if (!isEventPayload(envelope.payload)) {
    console.warn('[TAS Server] Invalid event payload')
    return
  }

  const event = envelope.payload

  // Apply the event to session state
  switch (event.event) {
    case 'tab.activated': {
      // Update augmentation
      const aug = session.augmentation.get(String(event.tabId)) || {}
      aug.lastActivated = event.timestamp
      session.augmentation.set(String(event.tabId), aug)
      break
    }

    case 'tab.created': {
      // Check if tab already exists to prevent duplicates
      const existingIndex = session.sessionTabs.findIndex((t) => t.id === event.tab.id)
      if (existingIndex === -1) {
        session.sessionTabs.push(event.tab)
      } else {
        // Update existing tab instead of creating duplicate
        session.sessionTabs[existingIndex] = event.tab
      }
      break
    }

    case 'tab.removed': {
      session.sessionTabs = session.sessionTabs.filter((t) => t.id !== event.tabId)
      session.augmentation.delete(String(event.tabId))
      break
    }

    case 'tab.updated': {
      const tabIndex = session.sessionTabs.findIndex((t) => t.id === event.tabId)
      if (tabIndex !== -1) {
        session.sessionTabs[tabIndex] = {
          ...session.sessionTabs[tabIndex],
          ...event.changes
        }
      }
      break
    }

    case 'augmentation.updated': {
      const existingAug = session.augmentation.get(String(event.tabId)) || {}
      session.augmentation.set(String(event.tabId), {
        ...existingAug,
        ...event.augmentation
      })
      break
    }

    case 'window.focused': {
      session.sessionWindows.forEach((w) => {
        w.focused = w.id === event.windowId
      })
      break
    }

    case 'window.created': {
      // Check if window already exists to prevent duplicates
      const existingIndex = session.sessionWindows.findIndex((w) => w.id === event.window.id)
      if (existingIndex === -1) {
        session.sessionWindows.push(event.window)
      } else {
        // Update existing window instead of creating duplicate
        session.sessionWindows[existingIndex] = event.window
      }
      break
    }

    case 'window.removed': {
      session.sessionWindows = session.sessionWindows.filter((w) => w.id !== event.windowId)
      break
    }
  }

  eventCallback?.(sessionKey, session, event)
}

/**
 * Handle WebSocket disconnect
 */
function handleDisconnect(ws: WebSocket): void {
  const mapping = wsToSession.get(ws)
  if (mapping) {
    const { sessionKey, connectionId } = mapping
    const session = sessions.get(sessionKey)

    if (session) {
      session.connections.delete(connectionId)
      console.log(
        `[TAS Server] Connection closed for ${session.browserType} ` +
          `(${session.connections.size} remaining connections)`
      )

      // Note: We don't delete the session - it may reconnect
      // Session cleanup can happen via a separate cleanup mechanism if needed
    }

    wsToSession.delete(ws)
  }

  connectionChangeCallback?.()
}

/**
 * Send a command to a specific session
 */
export function sendCommand(sessionKey: SessionKey, command: CommandPayload): void {
  const session = sessions.get(sessionKey)
  if (!session) return

  // Send to all connections for this session
  session.connections.forEach((conn) => {
    const envelope = createEnvelope<CommandPayload>(
      'command',
      session.instanceId,
      session.runtimeSessionId,
      conn.connectionId,
      0,
      command
    )
    sendToWs(conn.ws, envelope)
  })
}

/**
 * Send a command to all sessions
 */
export function sendCommandToAll(command: CommandPayload): void {
  sessions.forEach((session, sessionKey) => {
    if (session.hasSnapshot && session.connections.size > 0) {
      sendCommand(sessionKey, command)
    }
  })
}

/**
 * Get all sessions
 */
export function getAllSessions(): Map<SessionKey, Session> {
  return sessions
}

/**
 * Get a specific session
 */
export function getSession(sessionKey: SessionKey): Session | undefined {
  return sessions.get(sessionKey)
}

/**
 * Get all sessions with active connections and snapshots
 */
export function getActiveSessions(): Session[] {
  return Array.from(sessions.values()).filter(
    (session) => session.hasSnapshot && session.connections.size > 0
  )
}

/**
 * Check if any extension is connected
 */
export function isExtensionConnected(): boolean {
  for (const session of sessions.values()) {
    if (session.connections.size > 0 && session.hasSnapshot) {
      return true
    }
  }
  return false
}

/**
 * Get connected browser types (for backward compatibility)
 */
export function getConnectedBrowsers(): BrowserType[] {
  const browsers = new Set<BrowserType>()
  for (const session of sessions.values()) {
    if (session.connections.size > 0 && session.hasSnapshot) {
      browsers.add(session.browserType)
    }
  }
  return Array.from(browsers)
}

/**
 * Stop the WebSocket server
 */
export function stopWebSocketServer(): void {
  if (wss) {
    wss.close()
    wss = null
    sessions.clear()
    wsToSession.clear()
    console.log('[TAS Server] WebSocket server stopped')
  }
}

/**
 * Clean up stale sessions (no connections for a long time)
 */
export function cleanupStaleSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
  const now = Date.now()
  const staleKeys: SessionKey[] = []

  sessions.forEach((session, key) => {
    if (session.connections.size === 0 && now - session.lastActivity > maxAgeMs) {
      staleKeys.push(key)
    }
  })

  staleKeys.forEach((key) => {
    sessions.delete(key)
    console.log(`[TAS Server] Cleaned up stale session: ${key.substring(0, 16)}...`)
  })
}
