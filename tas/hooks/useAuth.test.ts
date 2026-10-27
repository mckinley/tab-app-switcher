import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useAuth } from "./useAuth"
import { setAuthPlatform, type AuthPlatform } from "../utils/appAuth"
import { fetchCloudCollections } from "../utils/collectionsSync"

const API = "https://api.example"
const alice = { id: "u1", name: "Alice", email: "alice@example.com" }

describe("useAuth in the extension and the Mac app", () => {
  let token: string | null
  let sessions: Record<string, typeof alice>
  let platform: AuthPlatform
  let listeners: (() => void)[]
  let serverDown: boolean

  beforeEach(() => {
    token = "app-token"
    sessions = { "app-token": alice }
    listeners = []
    serverDown = false
    platform = {
      apiBase: API,
      getToken: vi.fn(async () => token),
      signIn: vi.fn(async () => {
        token = "new-token"
        sessions["new-token"] = alice
      }),
      clearToken: vi.fn(async () => {
        token = null
      }),
      subscribe: (listener) => {
        listeners.push(listener)
        return () => listeners.splice(listeners.indexOf(listener), 1)
      },
    }
    setAuthPlatform(platform)
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit = {}) => {
        if (serverDown) return new Response("", { status: 503 })
        const bearer = new Headers(init.headers).get("Authorization")?.replace("Bearer ", "") ?? ""
        if (url === `${API}/api/auth/get-session`)
          return new Response(JSON.stringify(sessions[bearer] ? { user: sessions[bearer] } : null))
        if (url === `${API}/api/auth/sign-out`) {
          delete sessions[bearer]
          return new Response("{}")
        }
        if (url === `${API}/api/collections`)
          return new Response(sessions[bearer] ? "[]" : "", { status: sessions[bearer] ? 200 : 401 })
        return new Response("", { status: 404 })
      }),
    )
  })
  afterEach(() => {
    setAuthPlatform(null)
    vi.unstubAllGlobals()
  })

  it("shows the user of the stored token, asking without cookies", async () => {
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.user).toEqual(alice)
    expect(fetch).toHaveBeenCalledWith(
      `${API}/api/auth/get-session`,
      expect.objectContaining({ credentials: "omit", headers: { Authorization: "Bearer app-token" } }),
    )
  })

  it("forgets a token the server no longer knows, but not when the server is unreachable", async () => {
    serverDown = true
    const offline = renderHook(() => useAuth())
    await waitFor(() => expect(offline.result.current.isLoading).toBe(false))
    expect(offline.result.current.user).toBeNull()
    expect(platform.clearToken).not.toHaveBeenCalled()

    serverDown = false
    delete sessions["app-token"]
    const expired = renderHook(() => useAuth())
    await waitFor(() => expect(expired.result.current.isLoading).toBe(false))
    expect(expired.result.current.user).toBeNull()
    expect(platform.clearToken).toHaveBeenCalled()
  })

  it("signs in through the platform, and out on the server too", async () => {
    token = null
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.user).toBeNull()

    await act(() => result.current.signIn())
    expect(result.current.user).toEqual(alice)

    localStorage.setItem("tab-collections", "[]")
    await act(() => result.current.signOut())
    expect(result.current.user).toBeNull()
    expect(token).toBeNull()
    expect(sessions["new-token"]).toBeUndefined()
    // The apps' collections work signed out, so they stay
    expect(localStorage.getItem("tab-collections")).toBe("[]")
  })

  it("picks up a sign-in that finished in another window", async () => {
    token = null
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    token = "app-token"
    act(() => listeners.forEach((listener) => listener()))
    await waitFor(() => expect(result.current.user).toEqual(alice))
  })

  it("syncs collections with the token", async () => {
    expect(await fetchCloudCollections()).toEqual([])
    expect(fetch).toHaveBeenCalledWith(
      `${API}/api/collections`,
      expect.objectContaining({
        credentials: "omit",
        headers: expect.objectContaining({ Authorization: "Bearer app-token" }),
      }),
    )
  })
})

describe("useAuth on the site", () => {
  let signedIn: boolean

  beforeEach(() => {
    signedIn = true
    localStorage.clear()
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input instanceof Request ? input.url : input)
        if (url.endsWith("/api/auth/get-session"))
          return Response.json(signedIn ? { user: alice, session: { id: "s1", userId: alice.id } } : null)
        if (url.endsWith("/api/auth/sign-out")) {
          signedIn = false
          return Response.json({ success: true })
        }
        return new Response("", { status: 404 })
      }),
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  it("forgets the account's collections on sign-out, so the next account doesn't get them", async () => {
    localStorage.setItem("tab-collections", JSON.stringify([{ id: "a", name: "Reading", tabs: [] }]))
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.user).toEqual(alice))

    await act(() => result.current.signOut())

    expect(result.current.user).toBeNull()
    expect(localStorage.getItem("tab-collections")).toBeNull()
  })
})
