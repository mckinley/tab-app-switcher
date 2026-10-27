import { describe, it, expect, vi, beforeEach } from "vitest"
import { browser } from "wxt/browser"

vi.mock("wxt/browser", () => ({ browser: { storage: {} } }))

/** An in-memory storage area */
function memoryArea() {
  let stored: Record<string, unknown> = {}
  return {
    get: vi.fn(async (key: string) => ({ [key]: stored[key] })),
    set: vi.fn(async (items: Record<string, unknown>) => void (stored = { ...stored, ...items })),
  }
}

describe("identity", () => {
  beforeEach(() => vi.resetModules())

  it("keeps the session id in session storage, so a restarted service worker reuses it", async () => {
    ;(browser as any).storage = { local: memoryArea(), session: memoryArea() }
    const first = await (await import("./identity")).getIdentity()

    vi.resetModules()
    const restarted = await (await import("./identity")).getIdentity()

    expect(restarted).toEqual(first)
  })

  it("still has a session id without session storage (Firefox before 115)", async () => {
    ;(browser as any).storage = { local: memoryArea() }
    const { getIdentity, getRuntimeSessionId } = await import("./identity")

    const { instanceId, runtimeSessionId } = await getIdentity()

    expect(instanceId).toMatch(/^[0-9a-f-]{36}$/)
    expect(runtimeSessionId).toMatch(/^[0-9a-f-]{36}$/)
    expect(await getRuntimeSessionId()).toBe(runtimeSessionId)
  })
})
