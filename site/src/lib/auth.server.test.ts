// @vitest-environment node
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { createHash, generateKeyPairSync, randomBytes, verify } from "node:crypto"
import path from "node:path"
import { appleClientSecret, createAuth, signInProviders, type AuthEnv } from "./auth.server"
import { startAppSignIn } from "./appAuth.server"

// node:sqlite isn't in Vite's list of Node built-ins yet, so load it with require
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite")

const SITE = "https://tabappswitcher.com"
const CHROME_REDIRECT = "https://mfcjanplaceclfoipcengelejgfngcan.chromiumapp.org/"

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" })

const ENV: AuthEnv = {
  BETTER_AUTH_URL: SITE,
  BETTER_AUTH_SECRET: "test-secret-that-is-long-enough-for-better-auth",
  AUTH_GOOGLE_ID: "google-client-id",
  AUTH_GOOGLE_SECRET: "google-client-secret",
}

const APPLE_ENV: AuthEnv = {
  ...ENV,
  AUTH_APPLE_ID: "com.tabappswitcher.web",
  AUTH_APPLE_TEAM_ID: "TEAMID1234",
  AUTH_APPLE_KEY_ID: "KEYID12345",
  AUTH_APPLE_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
}

/** Better Auth on an in-memory SQLite database with the production schema (foreign keys on, as in D1) */
function createTestAuth(env = ENV, appleSecret?: string) {
  const sqlite = new DatabaseSync(":memory:")
  sqlite.exec(readFileSync(path.join(__dirname, "../../schema.sql"), "utf8"))
  return { sqlite, auth: createAuth(sqlite as unknown as D1Database, env, { appleClientSecret: appleSecret }) }
}

const decode = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"))

describe("Sign in with Apple", () => {
  it("is offered only once all of its settings are there", () => {
    expect(signInProviders(ENV)).toEqual(["google"])
    expect(signInProviders({ ...APPLE_ENV, AUTH_APPLE_KEY_ID: "" })).toEqual(["google"])
    expect(signInProviders(APPLE_ENV)).toEqual(["google", "apple"])
  })

  it("makes Apple's client secret from the key", async () => {
    expect(await appleClientSecret(ENV)).toBeUndefined()

    const secret = (await appleClientSecret(APPLE_ENV))!
    const [header, payload, signature] = secret.split(".")
    expect(decode(header)).toEqual({ alg: "ES256", kid: "KEYID12345" })
    const claims = decode(payload)
    expect(claims).toMatchObject({ iss: "TEAMID1234", sub: "com.tabappswitcher.web", aud: "https://appleid.apple.com" })
    // Apple refuses secrets that last longer than six months
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(60 * 60 * 24 * 180)
    const signed = verify(
      "sha256",
      Buffer.from(`${header}.${payload}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(signature, "base64url"),
    )
    expect(signed).toBe(true)
    // Made once, not on every request
    expect(await appleClientSecret(APPLE_ENV)).toBe(secret)
  })

  it("lets the apps choose, and starts Apple's sign-in", async () => {
    const { auth } = createTestAuth(APPLE_ENV, await appleClientSecret(APPLE_ENV))
    const options = { siteOrigin: SITE, providers: signInProviders(APPLE_ENV) }
    const challenge = createHash("sha256").update(randomBytes(32).toString("base64url")).digest("base64url")
    const start = `${SITE}/api/app-auth/start?${new URLSearchParams({ redirect: CHROME_REDIRECT, challenge })}`

    // Apps released before Sign in with Apple don't pass a provider: they get a page to choose
    const choose = await startAppSignIn(new Request(start), auth, options)
    expect(choose.status).toBe(200)
    const page = await choose.text()
    expect(page).toContain("Continue with Google")
    expect(page).toContain("provider=apple")

    const response = await startAppSignIn(new Request(`${start}&provider=apple`), auth, options)
    expect(response.status).toBe(302)
    const apple = new URL(response.headers.get("Location")!)
    expect(apple.hostname).toBe("appleid.apple.com")
    expect(apple.searchParams.get("client_id")).toBe("com.tabappswitcher.web")
    expect(apple.searchParams.get("redirect_uri")).toBe(`${SITE}/api/auth/callback/apple`)

    // Without Apple set up, there's no choice and no Apple
    const googleOnly = { siteOrigin: SITE }
    expect((await startAppSignIn(new Request(start), auth, googleOnly)).status).toBe(302)
    expect((await startAppSignIn(new Request(`${start}&provider=apple`), auth, googleOnly)).status).toBe(400)
  })
})

describe("deleting an account", () => {
  async function signedInUser() {
    const { sqlite, auth } = createTestAuth()
    const context = await auth.$context
    const user = await context.internalAdapter.createUser({
      email: "alice@example.com",
      name: "Alice",
      emailVerified: true,
    })
    const { token } = await context.internalAdapter.createSession(user.id)
    sqlite.prepare(`INSERT INTO "collection" (id, "userId", name) VALUES (?, ?, ?)`).run("c1", user.id, "Reading")
    const count = (table: string) =>
      (
        sqlite
          .prepare(`SELECT COUNT(*) AS n FROM "${table}" WHERE "${table === "user" ? "id" : "userId"}" = ?`)
          .get(user.id) as { n: number }
      ).n
    const deleteUser = () =>
      auth.handler(
        new Request(`${SITE}/api/auth/delete-user`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Origin: SITE },
          body: "{}",
        }),
      )
    return { sqlite, count, deleteUser, token }
  }

  it("deletes the user with their sessions and collections", async () => {
    const { count, deleteUser } = await signedInUser()
    expect(count("collection")).toBe(1)

    const response = await deleteUser()
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true })
    expect(count("user")).toBe(0)
    expect(count("session")).toBe(0)
    expect(count("collection")).toBe(0)
  })

  it("asks for a recent sign-in first", async () => {
    const { sqlite, count, deleteUser, token } = await signedInUser()
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    sqlite.prepare(`UPDATE "session" SET "createdAt" = ? WHERE token = ?`).run(twoDaysAgo, token)

    const response = await deleteUser()
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "SESSION_EXPIRED" })
    expect(count("user")).toBe(1)
  })
})
