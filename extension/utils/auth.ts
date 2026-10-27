/**
 * Sign-in for the extension: Google sign-in in a browser window, then a bearer token kept in
 * storage.local (see tas/utils/appAuth.ts and site/src/lib/appAuth.server.ts).
 *
 * Chrome, Edge and Firefox run the sign-in with identity.launchWebAuthFlow. Safari has no
 * identity API, so there it opens in a tab that ends on the site's /api/app-auth/done page,
 * where the sign-in content script hands the page's URL to the background.
 */
import { browser } from "wxt/browser"
import {
  appSignInUrl,
  createPkce,
  PRODUCTION_API_BASE,
  readSignInCode,
  redeemSignInCode,
  type AuthPlatform,
} from "@tas/utils/appAuth"

const API_BASE = PRODUCTION_API_BASE
const TOKEN_KEY = "tas_bearer_token"
/** The verifier of a sign-in running in a Safari tab */
const PENDING_KEY = "tas_pending_sign_in"
const PENDING_LIFETIME_MS = 10 * 60 * 1000

/** Where Safari's sign-in tab ends, which the sign-in content script matches */
export const SIGN_IN_DONE_URL = `${API_BASE}/api/app-auth/done`

async function getToken(): Promise<string | null> {
  const { [TOKEN_KEY]: token } = await browser.storage.local.get(TOKEN_KEY)
  return typeof token === "string" ? token : null
}

async function setToken(token: string | null): Promise<void> {
  if (token) await browser.storage.local.set({ [TOKEN_KEY]: token })
  else await browser.storage.local.remove(TOKEN_KEY)
}

async function signIn(): Promise<void> {
  const { verifier, challenge } = await createPkce()

  if (browser.identity?.launchWebAuthFlow) {
    const redirect = browser.identity.getRedirectURL()
    const resultUrl = await browser.identity
      .launchWebAuthFlow({ url: appSignInUrl(API_BASE, redirect, challenge), interactive: true })
      .catch(() => undefined)
    // Closing the window rejects
    if (!resultUrl) throw new Error("Sign-in was cancelled")
    await setToken(await redeemSignInCode(API_BASE, readSignInCode(resultUrl), verifier))
    return
  }

  // Safari: the background finishes when the tab reaches SIGN_IN_DONE_URL, and the storage
  // change tells the page
  await browser.storage.local.set({ [PENDING_KEY]: { verifier, startedAt: Date.now() } })
  await browser.tabs.create({ url: appSignInUrl(API_BASE, SIGN_IN_DONE_URL, challenge) })
}

/**
 * Background: finish a Safari sign-in from the URL of the page it ended on. Only a sign-in this
 * extension started can finish, since the code needs its verifier.
 */
export async function finishSignInFromPage(pageUrl: string): Promise<boolean> {
  if (!pageUrl.startsWith(`${SIGN_IN_DONE_URL}?`)) return false
  const { [PENDING_KEY]: pending } = await browser.storage.local.get(PENDING_KEY)
  const { verifier, startedAt } = (pending ?? {}) as { verifier?: string; startedAt?: number }
  if (!verifier || !startedAt || Date.now() - startedAt > PENDING_LIFETIME_MS) return false

  await browser.storage.local.remove(PENDING_KEY)
  await setToken(await redeemSignInCode(API_BASE, readSignInCode(pageUrl), verifier))
  return true
}

/** For setAuthPlatform() on extension pages that show the account */
export const extensionAuthPlatform: AuthPlatform = {
  apiBase: API_BASE,
  getToken,
  signIn,
  clearToken: () => setToken(null),
  subscribe(onChange) {
    const listener = (changes: Record<string, unknown>, areaName: string) => {
      if (areaName === "local" && TOKEN_KEY in changes) onChange()
    }
    browser.storage.onChanged.addListener(listener)
    return () => browser.storage.onChanged.removeListener(listener)
  },
}
