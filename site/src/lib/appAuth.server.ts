/**
 * Sign-in for the browser extension and the Mac app.
 *
 * They can't use the site's session cookie, so they get a bearer token (Better Auth's bearer
 * plugin) through a one-time code, the way native apps do OAuth (RFC 8252 with PKCE):
 *
 * 1. The app opens /api/app-auth/start?redirect=<its redirect URL>&challenge=<SHA-256 of a
 *    random verifier> in a browser window, which starts Google sign-in.
 * 2. Google returns to Better Auth's callback, which sets the site's session cookie and sends
 *    the browser on to /api/app-auth/finish. That redirects to <redirect>?code=<one-time code>.
 * 3. The app posts the code and its verifier to /api/app-auth/token and gets the token of a
 *    new session of its own, so signing out of the app doesn't sign the site out.
 *
 * Only the apps' own redirect URLs are allowed, and a code is useless without the verifier of
 * the app that asked for it, so a code that lands anywhere else can't be redeemed.
 */
import { NATIVE_SIGN_IN_REDIRECT } from "@tas/utils/appAuth"
import type { createAuth } from "./auth.server"

type Auth = ReturnType<typeof createAuth>

/** Chrome Web Store and Edge Add-ons ids. chrome.identity.getRedirectURL() is https://<id>.chromiumapp.org/ */
const CHROMIUM_EXTENSION_IDS = ["mfcjanplaceclfoipcengelejgfngcan", "epfinbjjhhlpbfcdmdhnddbjebmbkjck"]

/** Firefox's browser.identity.getRedirectURL(): the SHA-1 of tab-application-switcher@tabappswitcher.com */
const FIREFOX_REDIRECT_HOST = "40fb4908bc115ba720b671edaca2113c76c13cb9.extensions.allizom.org"

/** A page on this site for browsers without an identity API (Safari), whose content script reads the code */
export const DONE_PATH = "/api/app-auth/done"

const CODE_PREFIX = "app-auth:"
const CODE_LIFETIME_MS = 5 * 60 * 1000

/** Base64url SHA-256 of a PKCE verifier (RFC 7636) */
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/
const VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/

/** Auth endpoints the apps call with a bearer token, from extension pages and the Mac app's windows */
const BEARER_PATHS = new Set(["/api/auth/get-session", "/api/auth/sign-out"])

/**
 * Cross-origin requests are fine here because the apps send a bearer token, not cookies: with
 * "*" browsers won't send or expose a credentialed request, so web pages learn nothing.
 */
export const APP_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Expose-Headers": "set-auth-token",
}

export interface AppAuthOptions {
  /** This site's origin (BETTER_AUTH_URL) */
  siteOrigin: string
  /** More Chromium extension ids to allow, such as an unpacked development build's */
  extraExtensionIds?: string[]
}

/** Whether `redirect` is one of our apps' sign-in redirect URLs */
export function isAllowedRedirect(redirect: string, options: AppAuthOptions): boolean {
  let url: URL
  try {
    url = new URL(redirect)
  } catch {
    return false
  }
  if (url.username || url.password || url.search || url.hash) return false
  if (url.href === NATIVE_SIGN_IN_REDIRECT) return true
  if (url.origin === new URL(options.siteOrigin).origin && url.pathname === DONE_PATH) return true
  if (url.protocol !== "https:" || url.port) return false

  const chromium = url.hostname.match(/^([a-p]{32})\.chromiumapp\.org$/)
  if (chromium) return [...CHROMIUM_EXTENSION_IDS, ...(options.extraExtensionIds ?? [])].includes(chromium[1])
  return url.hostname === FIREFOX_REDIRECT_HOST
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

async function challengeFor(verifier: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))))
}

function badRequest(message: string): Response {
  return new Response(message, { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } })
}

function redirectTo(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" })
  cookies.forEach((cookie) => headers.append("Set-Cookie", cookie))
  return new Response(null, { status: 302, headers })
}

/** Read and check the redirect and challenge that start and finish both take */
function readFlow(request: Request, options: AppAuthOptions): { redirect: string; challenge: string } | Response {
  const params = new URL(request.url).searchParams
  const redirect = params.get("redirect") ?? ""
  const challenge = params.get("challenge") ?? ""
  if (!isAllowedRedirect(redirect, options)) return badRequest("Unknown redirect")
  if (!CHALLENGE_PATTERN.test(challenge)) return badRequest("Invalid challenge")
  return { redirect, challenge }
}

/** GET /api/app-auth/start: begin Google sign-in, coming back to finish */
export async function startAppSignIn(request: Request, auth: Auth, options: AppAuthOptions): Promise<Response> {
  const flow = readFlow(request, options)
  if (flow instanceof Response) return flow

  const finish = `/api/app-auth/finish?${new URLSearchParams(flow)}`
  const response = await auth.api.signInSocial({
    body: { provider: "google", callbackURL: finish, errorCallbackURL: finish },
    headers: request.headers,
    asResponse: true,
  })
  const { url } = (await response.json()) as { url?: string }
  if (!response.ok || !url) return new Response("Couldn't start sign-in", { status: 502 })
  // The OAuth state cookie, which Better Auth's callback checks
  return redirectTo(url, response.headers.getSetCookie())
}

/** GET /api/app-auth/finish: send the app a one-time code for the user who just signed in */
export async function finishAppSignIn(request: Request, auth: Auth, options: AppAuthOptions): Promise<Response> {
  const flow = readFlow(request, options)
  if (flow instanceof Response) return flow

  const target = new URL(flow.redirect)
  // Better Auth adds ?error= when Google sign-in fails or is cancelled
  const error = new URL(request.url).searchParams.get("error")
  const session = error ? null : await auth.api.getSession({ headers: request.headers })
  if (!session) {
    target.searchParams.set("error", error ?? "not_signed_in")
    return redirectTo(target.href)
  }

  const code = base64url(crypto.getRandomValues(new Uint8Array(32)))
  const context = await auth.$context
  await context.internalAdapter.createVerificationValue({
    identifier: CODE_PREFIX + code,
    value: JSON.stringify({ userId: session.user.id, challenge: flow.challenge }),
    expiresAt: new Date(Date.now() + CODE_LIFETIME_MS),
  })
  target.searchParams.set("code", code)
  return redirectTo(target.href)
}

/** POST /api/app-auth/token { code, verifier }: trade a code for the token of a new session */
export async function redeemAppCode(request: Request, auth: Auth): Promise<Response> {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...APP_CORS_HEADERS } })

  const body = (await request.json().catch(() => null)) as { code?: unknown; verifier?: unknown } | null
  const code = typeof body?.code === "string" ? body.code : ""
  const verifier = typeof body?.verifier === "string" ? body.verifier : ""
  if (!code || !VERIFIER_PATTERN.test(verifier)) return json({ error: "invalid_request" }, 400)

  const context = await auth.$context
  const identifier = CODE_PREFIX + code
  const stored = await context.internalAdapter.findVerificationValue(identifier)
  if (!stored) return json({ error: "invalid_code" }, 400)
  // A code works once, whatever happens next
  await context.internalAdapter.deleteVerificationByIdentifier(identifier)

  const { userId, challenge } = JSON.parse(stored.value) as { userId: string; challenge: string }
  if (new Date(stored.expiresAt).getTime() < Date.now() || (await challengeFor(verifier)) !== challenge) {
    return json({ error: "invalid_code" }, 400)
  }

  const session = await context.internalAdapter.createSession(userId, false, {
    ipAddress: request.headers.get("cf-connecting-ip") ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  })
  return json({ token: session.token, expiresAt: new Date(session.expiresAt).toISOString() })
}

/** GET /api/app-auth/done: where Safari's sign-in tab lands; the extension's content script takes it from here */
export function appSignInDonePage(request: Request): Response {
  const failed = new URL(request.url).searchParams.has("error")
  const message = failed
    ? "Sign-in didn't finish. Close this tab and try again from Tab Application Switcher."
    : "You're signed in to Tab Application Switcher. You can close this tab."
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Tab Application Switcher</title><style>body{font:16px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px;box-sizing:border-box;background:#fafafa;color:#18181b}@media (prefers-color-scheme:dark){body{background:#18181b;color:#fafafa}}</style></head><body><p>${message}</p></body></html>`
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  })
}

/** Let the apps call the bearer endpoints of /api/auth from other origins */
export function withAppCors(request: Request, response: Response): Response {
  if (!BEARER_PATHS.has(new URL(request.url).pathname)) return response
  const withCors = new Response(response.body, response)
  Object.entries(APP_CORS_HEADERS).forEach(([name, value]) => withCors.headers.set(name, value))
  return withCors
}

/** OPTIONS preflight for the bearer endpoints */
export function appCorsPreflight(request: Request): Response {
  if (!BEARER_PATHS.has(new URL(request.url).pathname)) return new Response(null, { status: 404 })
  return new Response(null, { status: 204, headers: APP_CORS_HEADERS })
}
