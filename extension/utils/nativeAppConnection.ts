/**
 * Native App WebSocket Transport
 *
 * Handles WebSocket communication with the native TAS app using the v1 protocol.
 * Responsibilities:
 * - Identity management (instanceId, runtimeSessionId, connectionId)
 * - Handshake: connect → connected → snapshot
 * - Send events after snapshot
 * - Handle commands from server
 * - Exponential backoff reconnection
 * - Ping/pong keepalive
 */

import {
  type ProtocolEnvelope,
  type MessageType,
  type ConnectPayload,
  type ConnectedPayload,
  type SnapshotPayload,
  type EventPayload,
  type CommandPayload,
  createEnvelope,
  isValidEnvelope,
  isCommandPayload,
} from "@tas/types/protocol"
import { getIdentity, generateConnectionId } from "./identity"
import { detectBrowserType, getExtensionVersion } from "./browserDetection"
import type { TabTracker } from "./tabTracker"

const WS_URL = "ws://localhost:48125"
const INITIAL_RECONNECT_DELAY = 1000 // 1 second
const MAX_RECONNECT_DELAY = 60000 // 1 minute
const PING_INTERVAL = 30000 // 30 seconds

interface TransportState {
  instanceId: string | null
  runtimeSessionId: string | null
  connectionId: string | null
  seq: number
  ws: WebSocket | null
  hasConnected: boolean // Has completed handshake
  reconnectDelay: number
  reconnectScheduled: boolean
  pingTimer: ReturnType<typeof setInterval> | null
}

export type CommandHandler = (command: CommandPayload) => void

export interface NativeAppTransport {
  connect(): Promise<void>
  disconnect(): void
  isConnected(): boolean
  sendEvent(event: EventPayload): void
  sendSnapshot(snapshot: SnapshotPayload): void
  onCommand(handler: CommandHandler): void
  offCommand(handler: CommandHandler): void
}

/**
 * Create a new NativeAppTransport instance
 */
export async function createNativeAppTransport(tabTracker: TabTracker): Promise<NativeAppTransport> {
  const state: TransportState = {
    instanceId: null,
    runtimeSessionId: null,
    connectionId: null,
    seq: 0,
    ws: null,
    hasConnected: false,
    reconnectDelay: INITIAL_RECONNECT_DELAY,
    reconnectScheduled: false,
    pingTimer: null,
  }

  const commandHandlers: Set<CommandHandler> = new Set()

  // Initialize identity (await once at startup)
  const identity = await getIdentity()
  state.instanceId = identity.instanceId
  state.runtimeSessionId = identity.runtimeSessionId
  console.log("[TAS] Identity initialized:", {
    instanceId: state.instanceId.substring(0, 8) + "...",
    runtimeSessionId: state.runtimeSessionId.substring(0, 8) + "...",
  })

  function nextSeq(): number {
    return ++state.seq
  }

  function send<T>(type: MessageType, payload: T): void {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return
    if (!state.instanceId || !state.runtimeSessionId || !state.connectionId) return

    const envelope = createEnvelope(
      type,
      state.instanceId,
      state.runtimeSessionId,
      state.connectionId,
      nextSeq(),
      payload,
    )

    state.ws.send(JSON.stringify(envelope))
  }

  function scheduleReconnect(): void {
    if (state.reconnectScheduled) return
    state.reconnectScheduled = true

    console.log(`[TAS] Scheduling reconnect in ${state.reconnectDelay / 1000}s...`)
    setTimeout(() => {
      state.reconnectScheduled = false
      state.reconnectDelay = Math.min(state.reconnectDelay * 2, MAX_RECONNECT_DELAY)
      attemptConnection()
    }, state.reconnectDelay)
  }

  function startPingTimer(): void {
    stopPingTimer()
    state.pingTimer = setInterval(() => {
      send("ping", {})
    }, PING_INTERVAL)
  }

  function stopPingTimer(): void {
    if (state.pingTimer) {
      clearInterval(state.pingTimer)
      state.pingTimer = null
    }
  }

  function handleMessage(event: MessageEvent): void {
    try {
      const msg = JSON.parse(event.data)

      if (!isValidEnvelope(msg)) {
        console.warn("[TAS] Invalid message envelope:", msg)
        return
      }

      const envelope = msg as ProtocolEnvelope

      switch (envelope.type) {
        case "connected": {
          const payload = envelope.payload as ConnectedPayload
          if (payload.ok) {
            console.log("[TAS] Handshake complete, server version:", payload.serverVersion)
            state.hasConnected = true
            state.reconnectDelay = INITIAL_RECONNECT_DELAY
            startPingTimer()

            // Send initial snapshot
            const snapshot = tabTracker.getSnapshot()
            send("snapshot", snapshot)
            console.log(
              `[TAS] Sent snapshot: ${snapshot.sessionTabs.length} tabs, ${snapshot.sessionWindows.length} windows`,
            )
          } else {
            console.error("[TAS] Handshake failed:", payload.error)
          }
          break
        }

        case "command": {
          if (isCommandPayload(envelope.payload)) {
            const cmd = envelope.payload
            console.log("[TAS] Received command:", cmd.command)
            commandHandlers.forEach((handler) => handler(cmd))
          }
          break
        }

        case "pong":
          // Heartbeat acknowledged, no action needed
          break

        case "ping":
          send("pong", {})
          break

        default:
          console.log("[TAS] Unhandled message type:", envelope.type)
      }
    } catch (error) {
      console.error("[TAS] Error handling message:", error)
    }
  }

  function attemptConnection(): void {
    // Don't attempt if already connected or connecting
    if (state.ws && (state.ws.readyState === WebSocket.CONNECTING || state.ws.readyState === WebSocket.OPEN)) {
      console.log("[TAS] WebSocket already connected or connecting")
      return
    }

    // Generate new connection ID for this attempt
    state.connectionId = generateConnectionId()
    state.seq = 0
    state.hasConnected = false

    console.log("[TAS] Connecting to native app...", {
      connectionId: state.connectionId.substring(0, 8) + "...",
    })

    try {
      state.ws = new WebSocket(WS_URL)

      state.ws.onopen = () => {
        console.log("[TAS] WebSocket connected, sending handshake")

        const connectPayload: ConnectPayload = {
          browserType: detectBrowserType(),
          extensionVersion: getExtensionVersion(),
        }

        send("connect", connectPayload)
      }

      state.ws.onmessage = handleMessage

      state.ws.onclose = () => {
        console.log("[TAS] WebSocket closed")
        state.ws = null
        state.hasConnected = false
        stopPingTimer()
        scheduleReconnect()
      }

      state.ws.onerror = (error) => {
        console.error("[TAS] WebSocket error:", error)
        // Close will fire after error, but ensure cleanup
        if (state.ws) {
          state.ws.close()
          state.ws = null
        }
        scheduleReconnect()
      }
    } catch (error) {
      console.error("[TAS] Failed to create WebSocket:", error)
      state.ws = null
      scheduleReconnect()
    }
  }

  // Subscribe to tab tracker events and forward to native app
  tabTracker.onEvent((event) => {
    if (state.hasConnected) {
      send("event", event)
    }
  })

  return {
    async connect() {
      attemptConnection()
    },

    disconnect() {
      stopPingTimer()
      state.reconnectScheduled = false // Don't reconnect
      if (state.ws) {
        state.ws.close()
        state.ws = null
      }
    },

    isConnected() {
      return state.ws !== null && state.ws.readyState === WebSocket.OPEN && state.hasConnected
    },

    sendEvent(event: EventPayload) {
      if (state.hasConnected) {
        send("event", event)
      }
    },

    sendSnapshot(snapshot: SnapshotPayload) {
      send("snapshot", snapshot)
    },

    onCommand(handler: CommandHandler) {
      commandHandlers.add(handler)
    },

    offCommand(handler: CommandHandler) {
      commandHandlers.delete(handler)
    },
  }
}
