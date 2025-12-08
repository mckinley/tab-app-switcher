import { supabase } from "@tas/utils/supabase"

const SUPABASE_URL = "https://vyxtwsiaqxoshrxyislb.supabase.co"

// Get the identity API (Chrome uses chrome.identity, Firefox uses browser.identity)
function getIdentityAPI() {
  if (typeof chrome !== "undefined" && chrome.identity) {
    return chrome.identity
  }
  if (typeof browser !== "undefined" && browser.identity) {
    return browser.identity
  }
  // In WXT dev mode, pages are served from localhost and don't have extension privileges
  throw new Error(
    "browser.identity API is not available. " +
      "This usually means you're running in WXT dev mode. " +
      "To test sign-in, build the extension and load it unpacked.",
  )
}

/**
 * Sign in with Google using browser's identity API (for extensions).
 * This opens a popup window for OAuth and captures the redirect.
 */
export async function signInWithGoogleExtension(): Promise<void> {
  const identity = getIdentityAPI()

  // Get the extension's redirect URL that Chrome can capture
  const redirectUrl = identity.getRedirectURL()

  // Construct the Supabase OAuth URL
  const params = new URLSearchParams({
    provider: "google",
    redirect_to: redirectUrl,
  })
  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`

  // Launch the OAuth flow in a popup
  const responseUrl = await identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true,
  })

  if (!responseUrl) {
    throw new Error("OAuth flow was cancelled")
  }

  // Extract tokens from the response URL hash
  const url = new URL(responseUrl)
  const hashParams = new URLSearchParams(url.hash.substring(1))
  const accessToken = hashParams.get("access_token")
  const refreshToken = hashParams.get("refresh_token")

  if (!accessToken || !refreshToken) {
    throw new Error("No tokens in OAuth response")
  }

  // Set the session in Supabase
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (error) {
    throw error
  }
}

/**
 * Sign out from Supabase.
 */
export async function signOutExtension(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}
