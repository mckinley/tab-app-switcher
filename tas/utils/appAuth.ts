/**
 * Sign-in for the site, the browser extension and the Mac app.
 *
 * The site uses its own session cookie. The extension and the Mac app can't, so they sign in
 * through /api/app-auth (site/src/lib/appAuth.server.ts) and keep a bearer token. Each calls
 * setAuthPlatform() before rendering, and useAuth and the collections sync use it from then on.
 */

export const PRODUCTION_API_BASE = "https://tabappswitcher.com"

/** Where sign-in returns to the Mac app: its local server, on the extension connection's port */
export const NATIVE_SIGN_IN_REDIRECT = "http://127.0.0.1:48125/auth/callback"

/** How an app keeps its bearer token and signs in */
export interface AuthPlatform {
  /** The API's origin, such as https://tabappswitcher.com */
  apiBase: string
  /** The stored token, or null when signed out */
  getToken: () => Promise<string | null>
  /** Sign in. Resolves once signed in, or when sign-in carries on elsewhere and `subscribe` will report it. */
  signIn: () => Promise<void>
  /** Forget the token */
  clearToken: () => Promise<void>
  /** Calls back whenever the token changes, such as after signing in from another window */
  subscribe?: (onChange: () => void) => () => void
}

let platform: AuthPlatform | null = null

export function setAuthPlatform(authPlatform: AuthPlatform | null): void {
  platform = authPlatform
}

export function getAuthPlatform(): AuthPlatform | null {
  return platform
}

/** The API's origin. On the site it's the page's own, so a local dev server uses its own API. */
export function getApiBase(): string {
  if (platform) return platform.apiBase
  if (typeof window !== "undefined" && window.location.protocol.startsWith("http")) return window.location.origin
  return PRODUCTION_API_BASE
}

/** What an API request needs to be signed in: the app's token, or the site's cookie */
export async function authRequestInit(): Promise<{ headers: Record<string, string>; credentials: RequestCredentials }> {
  if (!platform) return { headers: {}, credentials: "include" }
  const token = await platform.getToken()
  return { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "omit" }
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

/** A random verifier and its SHA-256 challenge (PKCE, RFC 7636) */
export async function createPkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)))
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
  return { verifier, challenge: base64url(new Uint8Array(digest)) }
}

/** The page that starts sign-in and ends at `redirect` with a code */
export function appSignInUrl(apiBase: string, redirect: string, challenge: string): string {
  return `${apiBase}/api/app-auth/start?${new URLSearchParams({ redirect, challenge })}`
}

/** The code from the URL sign-in ended at. Throws when sign-in failed or was cancelled. */
export function readSignInCode(url: string): string {
  const params = new URL(url).searchParams
  const code = params.get("code")
  if (code) return code
  throw new Error(params.get("error") === "access_denied" ? "Sign-in was cancelled" : "Sign-in didn't finish")
}

/** Trade a sign-in code and its verifier for a bearer token */
export async function redeemSignInCode(apiBase: string, code: string, verifier: string): Promise<string> {
  const response = await fetch(`${apiBase}/api/app-auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify({ code, verifier }),
  })
  if (!response.ok) throw new Error(`Sign-in failed (${response.status})`)
  const { token } = (await response.json()) as { token: string }
  return token
}
