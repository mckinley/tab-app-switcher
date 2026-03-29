import { setAuthHeaderProvider } from "@tas/utils/collectionsSync"

const API_BASE = "https://tabappswitcher.com"
const TOKEN_KEY = "tas_bearer_token"

// Get the identity API (Chrome uses chrome.identity, Firefox uses browser.identity)
function getIdentityAPI() {
  if (typeof chrome !== "undefined" && chrome.identity) {
    return chrome.identity
  }
  if (typeof browser !== "undefined" && browser.identity) {
    return browser.identity
  }
  throw new Error(
    "browser.identity API is not available. " +
      "This usually means you're running in WXT dev mode. " +
      "To test sign-in, build the extension and load it unpacked.",
  )
}

/** Get stored bearer token */
async function getStoredToken(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get(TOKEN_KEY, (result) => resolve(result[TOKEN_KEY] || null))
    } else if (typeof browser !== "undefined" && browser.storage?.local) {
      browser.storage.local.get(TOKEN_KEY).then((result) => resolve(result[TOKEN_KEY] || null))
    } else {
      resolve(localStorage.getItem(TOKEN_KEY))
    }
  })
}

/** Store bearer token */
async function storeToken(token: string): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.set({ [TOKEN_KEY]: token })
  } else if (typeof browser !== "undefined" && browser.storage?.local) {
    await browser.storage.local.set({ [TOKEN_KEY]: token })
  } else {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

/** Clear stored token */
async function clearToken(): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.remove(TOKEN_KEY)
  } else if (typeof browser !== "undefined" && browser.storage?.local) {
    await browser.storage.local.remove(TOKEN_KEY)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

/** Initialize auth header provider for collections sync */
export function initExtensionAuth() {
  setAuthHeaderProvider(async () => {
    const token = await getStoredToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  })
}

/**
 * Sign in with Google using browser's identity API (for extensions).
 * Opens OAuth via Better Auth, captures bearer token from the callback.
 */
export async function signInWithGoogleExtension(): Promise<void> {
  const identity = getIdentityAPI()
  const redirectUrl = identity.getRedirectURL()

  // Better Auth social sign-in URL
  const params = new URLSearchParams({
    callbackURL: redirectUrl,
  })
  const authUrl = `${API_BASE}/api/auth/sign-in/social?provider=google&${params.toString()}`

  // Launch the OAuth flow in a popup
  const responseUrl = await identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true,
  })

  if (!responseUrl) {
    throw new Error("OAuth flow was cancelled")
  }

  // After Better Auth completes OAuth, it redirects back.
  // Extract the session token from the URL or fetch it.
  const url = new URL(responseUrl)
  const sessionToken = url.searchParams.get("session_token")

  if (sessionToken) {
    await storeToken(sessionToken)
  } else {
    // Fallback: fetch session from the API using the cookie that was set
    const res = await fetch(`${API_BASE}/api/auth/get-session`, {
      credentials: "include",
    })
    if (res.ok) {
      const token = res.headers.get("set-auth-token")
      if (token) {
        await storeToken(token)
      }
    }
  }
}

/**
 * Sign out — clear local token and call server signout
 */
export async function signOutExtension(): Promise<void> {
  const token = await getStoredToken()
  if (token) {
    await fetch(`${API_BASE}/api/auth/sign-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {}) // best-effort
  }
  await clearToken()
}

/** Check if user has a stored token */
export async function isExtensionAuthenticated(): Promise<boolean> {
  const token = await getStoredToken()
  return !!token
}
