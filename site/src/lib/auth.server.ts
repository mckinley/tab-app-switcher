import { betterAuth } from "better-auth"
import { bearer } from "better-auth/plugins"

export interface AuthEnv {
  BETTER_AUTH_URL: string
  BETTER_AUTH_SECRET: string
  AUTH_GOOGLE_ID: string
  AUTH_GOOGLE_SECRET: string
  /** Sign in with Apple, offered once all four are set: the Services ID */
  AUTH_APPLE_ID?: string
  /** The Apple Developer team ID */
  AUTH_APPLE_TEAM_ID?: string
  /** The ID of the Sign in with Apple key */
  AUTH_APPLE_KEY_ID?: string
  /** That key's .p8 file (PEM) */
  AUTH_APPLE_PRIVATE_KEY?: string
}

export type SignInProvider = "google" | "apple"

/** The sign-in providers this deployment offers, in the order the sign-in page shows them */
export function signInProviders(env: AuthEnv): SignInProvider[] {
  const apple = env.AUTH_APPLE_ID && env.AUTH_APPLE_TEAM_ID && env.AUTH_APPLE_KEY_ID && env.AUTH_APPLE_PRIVATE_KEY
  return apple ? ["google", "apple"] : ["google"]
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

/** Apple accepts a client secret for up to six months; make a new one well before that */
const APPLE_SECRET_LIFETIME_S = 60 * 60 * 24 * 30
let appleSecret: { key: string; value: string; expiresAt: number } | null = null

/**
 * Apple's OAuth client secret: a JWT signed with the Sign in with Apple key (ES256). It's made
 * here from the key, instead of being a secret of its own, so it never needs renewing by hand.
 * Undefined when Sign in with Apple isn't set up.
 */
export async function appleClientSecret(env: AuthEnv): Promise<string | undefined> {
  if (!signInProviders(env).includes("apple")) return undefined
  const cacheKey = `${env.AUTH_APPLE_ID}:${env.AUTH_APPLE_KEY_ID}`
  const now = Math.floor(Date.now() / 1000)
  if (appleSecret?.key === cacheKey && appleSecret.expiresAt - now > 60 * 60 * 24) return appleSecret.value

  const pem = env.AUTH_APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n")
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g, "")), (char) => char.charCodeAt(0))
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"])
  const encode = (value: object) => base64url(new TextEncoder().encode(JSON.stringify(value)))
  const expiresAt = now + APPLE_SECRET_LIFETIME_S
  const unsigned = `${encode({ alg: "ES256", kid: env.AUTH_APPLE_KEY_ID })}.${encode({
    iss: env.AUTH_APPLE_TEAM_ID,
    iat: now,
    exp: expiresAt,
    aud: "https://appleid.apple.com",
    sub: env.AUTH_APPLE_ID,
  })}`
  // Web Crypto's ECDSA signature is r and s back to back, which is what JWS wants
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned),
  )
  appleSecret = { key: cacheKey, value: `${unsigned}.${base64url(new Uint8Array(signature))}`, expiresAt }
  return appleSecret.value
}

// Better Auth factory — called per-request since CF Workers pass env through context.
// Pass Apple's client secret (appleClientSecret) where Sign in with Apple can start or finish.
export function createAuth(db: D1Database, env: AuthEnv, options: { appleClientSecret?: string } = {}) {
  const apple = options.appleClientSecret
    ? { apple: { clientId: env.AUTH_APPLE_ID!, clientSecret: options.appleClientSecret } }
    : {}
  return betterAuth({
    database: db,
    basePath: "/api/auth",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    plugins: [bearer()],
    socialProviders: {
      google: {
        clientId: env.AUTH_GOOGLE_ID,
        clientSecret: env.AUTH_GOOGLE_SECRET,
      },
      ...apple,
    },
    // From the Account page. The user's sessions, accounts and collections go with it: their
    // foreign keys cascade, and D1 enforces foreign keys
    user: { deleteUser: { enabled: true } },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refresh when < 1 day remaining
    },
    // Local dev server port comes from site/.env.development (PORT=4409). Apple posts its
    // sign-in result back from its own origin.
    trustedOrigins: ["http://localhost:4409", "https://tabappswitcher.com", "https://appleid.apple.com"],
  })
}

// Helper to get session from request headers (works with both cookies and bearer tokens)
export async function getSession(request: Request, db: D1Database, env: AuthEnv) {
  const auth = createAuth(db, env)
  return auth.api.getSession({ headers: request.headers })
}
