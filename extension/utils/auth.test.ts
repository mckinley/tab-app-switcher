import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createHash } from "node:crypto"

const mock = vi.hoisted(() => {
  const storage: Record<string, unknown> = {}
  const listeners = new Set<(changes: Record<string, unknown>, areaName: string) => void>()
  const notify = (key: string) => listeners.forEach((listener) => listener({ [key]: {} }, "local"))
  return {
    storage,
    browser: {
      storage: {
        local: {
          get: async (key: string) => (key in storage ? { [key]: storage[key] } : {}),
          set: async (items: Record<string, unknown>) => {
            Object.assign(storage, items)
            Object.keys(items).forEach(notify)
          },
          remove: async (key: string) => {
            delete storage[key]
            notify(key)
          },
        },
        onChanged: {
          addListener: (listener: never) => listeners.add(listener),
          removeListener: (listener: never) => listeners.delete(listener),
        },
      },
      identity: undefined as
        | undefined
        | {
            getRedirectURL: () => string
            launchWebAuthFlow: (details: { url: string }) => Promise<string | undefined>
          },
      tabs: { create: vi.fn(async (_details: { url: string }) => ({ id: 7 })) },
    },
  }
})
vi.mock("wxt/browser", () => ({ browser: mock.browser }))

import { extensionAuthPlatform, finishSignInFromPage, SIGN_IN_DONE_URL } from "./auth"

const REDIRECT = "https://mfcjanplaceclfoipcengelejgfngcan.chromiumapp.org/"

describe("extension sign-in", () => {
  let challenges: Map<string, string>

  beforeEach(() => {
    for (const key of Object.keys(mock.storage)) delete mock.storage[key]
    mock.browser.identity = undefined
    mock.browser.tabs.create.mockClear()
    challenges = new Map()
    // The server's token endpoint: a code redeems only with the verifier whose hash started the sign-in
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        expect(url).toBe("https://tabappswitcher.com/api/app-auth/token")
        const { code, verifier } = JSON.parse(String(init.body))
        const ok = challenges.get(code) === createHash("sha256").update(verifier).digest("base64url")
        return new Response(JSON.stringify(ok ? { token: `token-for-${code}` } : { error: "invalid_code" }), {
          status: ok ? 200 : 400,
        })
      }),
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  /** The server's side of start → Google → finish: a code for the challenge, at the redirect */
  function completeSignIn(startUrl: string, code: string): string {
    const start = new URL(startUrl)
    expect(start.origin + start.pathname).toBe("https://tabappswitcher.com/api/app-auth/start")
    challenges.set(code, start.searchParams.get("challenge")!)
    return `${start.searchParams.get("redirect")}?code=${code}`
  }

  it("signs in through the browser's identity window and keeps the token", async () => {
    mock.browser.identity = {
      getRedirectURL: () => REDIRECT,
      launchWebAuthFlow: vi.fn(async ({ url }) => completeSignIn(url, "c1")),
    }
    const onChange = vi.fn()
    const unsubscribe = extensionAuthPlatform.subscribe!(onChange)

    await extensionAuthPlatform.signIn()

    expect(await extensionAuthPlatform.getToken()).toBe("token-for-c1")
    expect(onChange).toHaveBeenCalled()
    unsubscribe()

    await extensionAuthPlatform.clearToken()
    expect(await extensionAuthPlatform.getToken()).toBeNull()
  })

  it("reports a closed or failed sign-in window", async () => {
    mock.browser.identity = {
      getRedirectURL: () => REDIRECT,
      launchWebAuthFlow: async () => {
        throw new Error("The user did not approve access.")
      },
    }
    await expect(extensionAuthPlatform.signIn()).rejects.toThrow("Sign-in was cancelled")

    mock.browser.identity.launchWebAuthFlow = async () => `${REDIRECT}?error=access_denied`
    await expect(extensionAuthPlatform.signIn()).rejects.toThrow("Sign-in was cancelled")
    expect(await extensionAuthPlatform.getToken()).toBeNull()
  })

  it("in Safari, signs in through a tab that ends on the site's done page", async () => {
    await extensionAuthPlatform.signIn()
    const startUrl = mock.browser.tabs.create.mock.calls[0][0].url
    expect(new URL(startUrl).searchParams.get("redirect")).toBe(SIGN_IN_DONE_URL)
    const doneUrl = completeSignIn(startUrl, "c2")

    // Only the done page, and only once
    expect(await finishSignInFromPage(`https://evil.example/?code=c2`)).toBe(false)
    expect(await finishSignInFromPage(doneUrl)).toBe(true)
    expect(await extensionAuthPlatform.getToken()).toBe("token-for-c2")
    expect(await finishSignInFromPage(doneUrl)).toBe(false)
  })

  it("in Safari, ignores a done page this extension didn't send the user to", async () => {
    // A page that sends the user to the done page with someone else's code
    expect(await finishSignInFromPage(`${SIGN_IN_DONE_URL}?code=planted`)).toBe(false)

    // A sign-in that was started long ago
    await extensionAuthPlatform.signIn()
    const doneUrl = completeSignIn(mock.browser.tabs.create.mock.calls[0][0].url, "c3")
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 11 * 60 * 1000)
    expect(await finishSignInFromPage(doneUrl)).toBe(false)
    vi.restoreAllMocks()
    expect(await extensionAuthPlatform.getToken()).toBeNull()
  })
})
