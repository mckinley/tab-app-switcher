/**
 * WebSocket Protocol Types for Tab Application Switcher
 *
 * Defines the communication protocol between browser extensions and the native app.
 * All messages use a versioned envelope format with session identity.
 */

import type { BrowserType } from "./tabs"

// Protocol version - increment when making breaking changes
export const PROTOCOL_VERSION = 1

// Message types
export type MessageType =
  | "connect" // Client → Server: Initial handshake
  | "connected" // Server → Client: Handshake acknowledgment
  | "snapshot" // Client → Server: Full state replacement
  | "event" // Client → Server: Incremental update
  | "command" // Server → Client: Action request
  | "ping" // Bidirectional keepalive
  | "pong" // Bidirectional keepalive response

/**
 * Protocol envelope - wraps all messages with identity and sequencing
 */
export interface ProtocolEnvelope<T = unknown> {
  v: typeof PROTOCOL_VERSION // Protocol version
  type: MessageType // Message type discriminator
  instanceId: string // Permanent browser profile ID (UUID)
  runtimeSessionId: string // Browser session ID (UUID, changes on browser restart)
  connectionId: string // WebSocket connection ID (UUID)
  seq: number // Monotonic sequence number
  ts: number // Timestamp (Date.now())
  payload: T // Type-specific payload
}

// ============================================================================
// Payload Types
// ============================================================================

/**
 * connect: Client → Server
 * Sent immediately when WebSocket opens to identify the extension
 */
export interface ConnectPayload {
  browserType: BrowserType
  extensionVersion: string
}

/**
 * connected: Server → Client
 * Confirms registration and readiness
 */
export interface ConnectedPayload {
  ok: boolean
  serverVersion: string
  error?: string
}

/**
 * snapshot: Client → Server
 * Full state replacement for the session
 */
export interface SnapshotPayload {
  sessionTabs: BrowserTab[] // Raw tabs from browser.tabs.query({})
  sessionWindows: BrowserWindow[] // Raw windows from browser.windows.getAll()
  augmentation: Record<string, TabAugmentation> // TAS-specific data keyed by tabId
  recentlyClosed?: SessionTab[] // Recently closed tabs from chrome.sessions API
  otherDevices?: DeviceSession[] // Tabs from other synced devices
}

/**
 * SessionTab - A tab from chrome.sessions API (recently closed or from another device)
 */
export interface SessionTab {
  sessionId: string // Session ID for restoring
  title: string
  url: string
  favIconUrl?: string
  lastModified: number // Timestamp in seconds since epoch
}

/**
 * DeviceSession - Tabs from another synced device
 */
export interface DeviceSession {
  deviceName: string
  tabs: SessionTab[]
}

/**
 * event: Client → Server
 * Incremental updates after snapshot
 */
export type EventPayload =
  | { event: "tab.activated"; tabId: number; windowId: number; timestamp: number }
  | { event: "tab.created"; tab: BrowserTab }
  | { event: "tab.removed"; tabId: number; windowId: number }
  | { event: "tab.updated"; tabId: number; changes: Partial<BrowserTab> }
  | { event: "augmentation.updated"; tabId: number; augmentation: Partial<TabAugmentation> }
  | { event: "window.focused"; windowId: number }
  | { event: "window.created"; window: BrowserWindow }
  | { event: "window.removed"; windowId: number }

/**
 * command: Server → Client
 * Actions the extension should execute
 */
export type CommandPayload =
  | { command: "activateTab"; tabId: number; windowId: number }
  | { command: "closeTab"; tabId: number }
  | { command: "requestSnapshot" } // Force a full resync
  | { command: "refresh" } // Clear state and re-query all tabs from browser API

// ============================================================================
// Browser API Types (preserved exactly as returned by browser APIs)
// ============================================================================

/**
 * BrowserTab - mirrors browser.tabs.Tab
 * All fields are optional to match the actual browser API behavior
 */
export interface BrowserTab {
  id?: number
  index: number
  windowId: number
  openerTabId?: number
  highlighted: boolean
  active: boolean
  pinned: boolean
  audible?: boolean
  discarded?: boolean
  autoDiscardable?: boolean
  mutedInfo?: {
    muted: boolean
    reason?: string
    extensionId?: string
  }
  url?: string
  pendingUrl?: string
  title?: string
  favIconUrl?: string
  status?: "loading" | "complete" | "unloaded"
  incognito: boolean
  width?: number
  height?: number
  sessionId?: string
  groupId?: number
  lastAccessed?: number // Chrome's built-in timestamp
}

/**
 * BrowserWindow - mirrors browser.windows.Window
 */
export interface BrowserWindow {
  id?: number
  focused: boolean
  top?: number
  left?: number
  width?: number
  height?: number
  incognito: boolean
  type?: "normal" | "popup" | "panel" | "app" | "devtools"
  state?: "normal" | "minimized" | "maximized" | "fullscreen" | "locked-fullscreen"
  alwaysOnTop: boolean
  sessionId?: string
}

// ============================================================================
// TAS Augmentation Types
// ============================================================================

/**
 * TabAugmentation - TAS-specific data layered on top of browser data
 * Used for sorting and display purposes
 */
export interface TabAugmentation {
  lastActivated?: number // When TAS detected this tab gained focus
  lastDeactivated?: number // When TAS detected this tab lost focus
  faviconDataUrl?: string // Cached favicon as data URL
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a protocol envelope with the given parameters
 */
export function createEnvelope<T>(
  type: MessageType,
  instanceId: string,
  runtimeSessionId: string,
  connectionId: string,
  seq: number,
  payload: T,
): ProtocolEnvelope<T> {
  return {
    v: PROTOCOL_VERSION,
    type,
    instanceId,
    runtimeSessionId,
    connectionId,
    seq,
    ts: Date.now(),
    payload,
  }
}

/**
 * Validate that a message is a valid protocol envelope
 */
export function isValidEnvelope(msg: unknown): msg is ProtocolEnvelope {
  if (typeof msg !== "object" || msg === null) return false
  const e = msg as ProtocolEnvelope
  return (
    e.v === PROTOCOL_VERSION &&
    typeof e.type === "string" &&
    typeof e.instanceId === "string" &&
    typeof e.runtimeSessionId === "string" &&
    typeof e.connectionId === "string" &&
    typeof e.seq === "number" &&
    typeof e.ts === "number" &&
    "payload" in e
  )
}

/**
 * Type guard for connect payload
 */
export function isConnectPayload(payload: unknown): payload is ConnectPayload {
  if (typeof payload !== "object" || payload === null) return false
  const p = payload as ConnectPayload
  return typeof p.browserType === "string" && typeof p.extensionVersion === "string"
}

/**
 * Type guard for snapshot payload
 */
export function isSnapshotPayload(payload: unknown): payload is SnapshotPayload {
  if (typeof payload !== "object" || payload === null) return false
  const p = payload as SnapshotPayload
  return Array.isArray(p.sessionTabs) && Array.isArray(p.sessionWindows) && typeof p.augmentation === "object"
}

/**
 * Type guard for event payload
 */
export function isEventPayload(payload: unknown): payload is EventPayload {
  if (typeof payload !== "object" || payload === null) return false
  return "event" in payload && typeof (payload as EventPayload).event === "string"
}

/**
 * Type guard for command payload
 */
export function isCommandPayload(payload: unknown): payload is CommandPayload {
  if (typeof payload !== "object" || payload === null) return false
  return "command" in payload && typeof (payload as CommandPayload).command === "string"
}
