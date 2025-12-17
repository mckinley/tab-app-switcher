/**
 * Identity Management for WebSocket Protocol
 *
 * Manages the identity hierarchy for extension ↔ native communication:
 * - instanceId: Permanent UUID per browser profile (survives everything)
 * - runtimeSessionId: Per browser session (survives MV3 service worker restarts)
 * - connectionId: Per WebSocket connection (in-memory only)
 */

const INSTANCE_ID_KEY = "tas_instanceId"
const RUNTIME_SESSION_ID_KEY = "tas_runtimeSessionId"

/**
 * Get or create the permanent instance ID for this browser profile.
 * Stored in chrome.storage.local (persists across browser restarts).
 * This uniquely identifies this browser profile forever.
 */
export async function getInstanceId(): Promise<string> {
  const result = await browser.storage.local.get(INSTANCE_ID_KEY)
  if (result[INSTANCE_ID_KEY]) {
    return result[INSTANCE_ID_KEY]
  }

  const newId = crypto.randomUUID()
  await browser.storage.local.set({ [INSTANCE_ID_KEY]: newId })
  console.log("[TAS] Created new instanceId:", newId)
  return newId
}

/**
 * Get or create the runtime session ID for this browser session.
 * Stored in chrome.storage.session (persists across MV3 service worker restarts,
 * but clears when browser closes).
 *
 * This means:
 * - MV3 service worker restart → same runtimeSessionId (reconnect to existing session)
 * - Browser restart → new runtimeSessionId (new session on native app)
 */
export async function getRuntimeSessionId(): Promise<string> {
  // chrome.storage.session is MV3 only, persists across service worker restarts
  // but clears when browser closes
  const result = await browser.storage.session.get(RUNTIME_SESSION_ID_KEY)
  if (result[RUNTIME_SESSION_ID_KEY]) {
    return result[RUNTIME_SESSION_ID_KEY]
  }

  const newId = crypto.randomUUID()
  await browser.storage.session.set({ [RUNTIME_SESSION_ID_KEY]: newId })
  console.log("[TAS] Created new runtimeSessionId:", newId)
  return newId
}

/**
 * Generate a new connection ID for each WebSocket connection attempt.
 * In-memory only, not persisted.
 *
 * This allows tracking individual connection attempts and handling
 * reconnections properly (new connectionId, same session identity).
 */
export function generateConnectionId(): string {
  return crypto.randomUUID()
}

/**
 * Get all identity values at once
 * Useful for initializing the WebSocket transport
 */
export async function getIdentity(): Promise<{
  instanceId: string
  runtimeSessionId: string
}> {
  const [instanceId, runtimeSessionId] = await Promise.all([getInstanceId(), getRuntimeSessionId()])

  return { instanceId, runtimeSessionId }
}
