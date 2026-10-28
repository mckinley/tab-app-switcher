// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { createHash, randomBytes } from "node:crypto"
import path from "node:path"
import { createAuth } from "./auth.server"
import {
  appCorsPreflight,
  finishAppSignIn,
  isAllowedRedirect,
  redeemAppCode,
  startAppSignIn,
  withAppCors,
  withSignOutBody,
} from "./appAuth.server"
import { NATIVE_SIGN_IN_REDIRECT as NATIVE_REDIRECT } from "@tas/utils/appAuth"

// node:sqlite isn't in Vite's list of Node built-ins yet, so load it with require
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite")

const SITE = "https://tabappswitcher.com"
const CHROME_REDIRECT = "https://mfcjanplaceclfoipcengelejgfngcan.chromiumapp.org/"
const options = { siteOrigin: SITE }

/** Better Auth on an in-memory SQLite database with the production schema (Better Auth reads node:sqlite directly) */
function createTestAuth() {
  const sqlite = new DatabaseSync(":memory:")
  sqlite.exec(readFileSync(path.join(__dirname, "../../schema.sql"), "utf8"))
  return createAuth(sqlite as unknown as D1Database, {
    BETTER_AUTH_URL: SITE,
    BETTER_AUTH_SECRET: "test-secret-that-is-long-enough-for-better-auth",
    AUTH_GOOGLE_ID: "google-client-id",
    AUTH_GOOGLE_SECRET: "google-client-secret",
  })
}

function pkce() {
  const verifier = randomBytes(32).toString("base64url")
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") }
}

const flowUrl = (action: string, redirect: string, challenge: string, extra = "") =>
  `${SITE}/api/app-auth/${action}?${new URLSearchParams({ redirect, challenge })}${extra}`

describe("app sign-in redirects", () => {
  it.each([
    [CHROME_REDIRECT, true],
    ["https://epfinbjjhhlpbfcdmdhnddbjebmbkjck.chromiumapp.org/", true],
    ["https://40fb4908bc115ba720b671edaca2113c76c13cb9.extensions.allizom.org/", true],
    [NATIVE_REDIRECT, true],
    [`${SITE}/api/app-auth/done`, true],
    // Another extension, another site, or ours with something extra
    ["https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.chromiumapp.org/", false],
    ["https://evil.example/", false],
    ["https://evil.example/api/app-auth/done", false],
    [`${SITE}/account`, false],
    [`${CHROME_REDIRECT}?code=planted`, false],
    ["https://user@mfcjanplaceclfoipcengelejgfngcan.chromiumapp.org/", false],
    ["https://mfcjanplaceclfoipcengelejgfngcan.chromiumapp.org:8443/", false],
    ["http://mfcjanplaceclfoipcengelejgfngcan.chromiumapp.org/", false],
    ["http://127.0.0.1:9999/auth/callback", false],
    ["http://localhost:48125/auth/callback", false],
    ["not a url", false],
  ])("%s → %s", (redirect, allowed) => {
    expect(isAllowedRedirect(redirect, options)).toBe(allowed)
  })

  it("allows extra extension ids, for development builds", () => {
    const dev = "https://bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.chromiumapp.org/"
    expect(isAllowedRedirect(dev, options)).toBe(false)
    expect(isAllowedRedirect(dev, { ...options, extraExtensionIds: ["bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"] })).toBe(true)
  })
})

describe("app sign-in", () => {
  let auth: ReturnType<typeof createTestAuth>
  let siteToken: string
  let userId: string

  beforeEach(async () => {
    auth = createTestAuth()
    const context = await auth.$context
    const user = await context.internalAdapter.createUser({
      email: "alice@example.com",
      name: "Alice",
      emailVerified: true,
    })
    userId = user.id
    siteToken = (await context.internalAdapter.createSession(user.id)).token
  })

  /** Signed in on the site, as after Google sign-in (the bearer header stands in for the cookie) */
  const signedIn = (url: string) => new Request(url, { headers: { Authorization: `Bearer ${siteToken}` } })

  async function getCode(redirect: string, challenge: string): Promise<string> {
    const response = await finishAppSignIn(signedIn(flowUrl("finish", redirect, challenge)), auth, options)
    expect(response.status).toBe(302)
    const location = new URL(response.headers.get("Location")!)
    expect(location.origin + location.pathname).toBe(new URL(redirect).origin + new URL(redirect).pathname)
    return location.searchParams.get("code")!
  }

  const redeem = (body: unknown) =>
    redeemAppCode(new Request(`${SITE}/api/app-auth/token`, { method: "POST", body: JSON.stringify(body) }), auth)

  async function sessionUser(token: string) {
    const response = withAppCors(
      new Request(`${SITE}/api/auth/get-session`),
      await auth.handler(
        new Request(`${SITE}/api/auth/get-session`, { headers: { Authorization: `Bearer ${token}` } }),
      ),
    )
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*")
    return ((await response.json()) as { user: { id: string } } | null)?.user ?? null
  }

  it("starts Google sign-in that comes back to finish", async () => {
    const { challenge } = pkce()
    const response = await startAppSignIn(new Request(flowUrl("start", CHROME_REDIRECT, challenge)), auth, options)

    expect(response.status).toBe(302)
    const google = new URL(response.headers.get("Location")!)
    expect(google.hostname).toBe("accounts.google.com")
    expect(google.searchParams.get("redirect_uri")).toBe(`${SITE}/api/auth/callback/google`)
    // The state cookie that Better Auth's callback checks
    expect(response.headers.getSetCookie().some((cookie) => cookie.includes("state="))).toBe(true)

    const context = await auth.$context
    const state = await context.internalAdapter.findVerificationValue(google.searchParams.get("state")!)
    expect(JSON.parse(state!.value).callbackURL).toBe(
      `/api/app-auth/finish?${new URLSearchParams({ redirect: CHROME_REDIRECT, challenge })}`,
    )
  })

  it("refuses redirects that aren't our apps', and bad challenges", async () => {
    const { challenge } = pkce()
    for (const action of [startAppSignIn, finishAppSignIn]) {
      expect((await action(signedIn(flowUrl("start", "https://evil.example/", challenge)), auth, options)).status).toBe(
        400,
      )
      expect((await action(signedIn(flowUrl("start", CHROME_REDIRECT, "short")), auth, options)).status).toBe(400)
    }
  })

  it("trades the code and verifier for a new session's token", async () => {
    const { verifier, challenge } = pkce()
    const code = await getCode(CHROME_REDIRECT, challenge)

    const response = await redeem({ code, verifier })
    expect(response.status).toBe(200)
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*")
    const { token } = (await response.json()) as { token: string }

    expect(token).not.toBe(siteToken)
    expect((await sessionUser(token))?.id).toBe(userId)

    // Signing the app out leaves the site signed in
    await auth.handler(
      new Request(`${SITE}/api/auth/sign-out`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }),
    )
    expect(await sessionUser(token)).toBeNull()
    expect((await sessionUser(siteToken))?.id).toBe(userId)
  })

  it("ends the session when an older app signs out without a content type", async () => {
    const { verifier, challenge } = pkce()
    const { token } = (await (await redeem({ code: await getCode(CHROME_REDIRECT, challenge), verifier })).json()) as {
      token: string
    }
    // Apps up to 1.2.5 send a bare POST, which reaches the Worker with an empty body
    const bare = () =>
      new Request(`${SITE}/api/auth/sign-out`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Origin: "chrome-extension://abc" },
        body: new Uint8Array(0),
      })
    expect((await auth.handler(bare())).status).toBe(415)
    expect((await auth.handler(withSignOutBody(bare()))).status).toBe(200)
    expect(await sessionUser(token)).toBeNull()
    expect((await sessionUser(siteToken))?.id).toBe(userId)
  })

  it("redeems a code once, and only with its own verifier", async () => {
    const { verifier, challenge } = pkce()
    const code = await getCode(NATIVE_REDIRECT, challenge)

    expect((await redeem({ code, verifier: pkce().verifier })).status).toBe(400)
    // The failed try used the code up
    expect((await redeem({ code, verifier })).status).toBe(400)

    const second = pkce()
    const secondCode = await getCode(NATIVE_REDIRECT, second.challenge)
    expect((await redeem({ code: secondCode, verifier: second.verifier })).status).toBe(200)
    expect((await redeem({ code: secondCode, verifier: second.verifier })).status).toBe(400)
    expect((await redeem({ code: "made-up", verifier: second.verifier })).status).toBe(400)
    expect((await redeem({})).status).toBe(400)
  })

  it("sends the app an error when sign-in didn't finish", async () => {
    const { challenge } = pkce()
    const signedOut = await finishAppSignIn(new Request(flowUrl("finish", NATIVE_REDIRECT, challenge)), auth, options)
    expect(new URL(signedOut.headers.get("Location")!).searchParams.get("error")).toBe("not_signed_in")

    const cancelled = await finishAppSignIn(
      signedIn(flowUrl("finish", NATIVE_REDIRECT, challenge, "&error=access_denied")),
      auth,
      options,
    )
    const location = new URL(cancelled.headers.get("Location")!)
    expect(location.searchParams.get("error")).toBe("access_denied")
    expect(location.searchParams.has("code")).toBe(false)
  })

  it("answers CORS preflights only for the endpoints the apps use", () => {
    expect(appCorsPreflight(new Request(`${SITE}/api/auth/get-session`, { method: "OPTIONS" })).status).toBe(204)
    expect(appCorsPreflight(new Request(`${SITE}/api/auth/sign-out`, { method: "OPTIONS" })).status).toBe(204)
    expect(appCorsPreflight(new Request(`${SITE}/api/auth/sign-in/social`, { method: "OPTIONS" })).status).toBe(404)
  })
})
