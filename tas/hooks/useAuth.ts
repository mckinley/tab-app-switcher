import { useEffect, useState, useCallback } from "react"
import { createAuthClient } from "better-auth/client"
import { getApiBase, getAuthPlatform } from "../utils/appAuth"
import { clearLocalCollections } from "../utils/collectionsStorage"

export interface AuthUser {
  id: string
  name: string
  email: string
  image?: string | null
}

interface UseAuthOptions {
  /** URL to redirect to after OAuth callback */
  callbackURL?: string
}

/** How the site signs in; the apps choose on the site's own page */
export type SignInProvider = "google" | "apple"

/** What deleteAccount() did */
export type DeleteAccountResult = "deleted" | "sign-in-again"

interface UseAuthReturn {
  user: AuthUser | null
  isLoading: boolean
  signIn: (provider?: SignInProvider) => Promise<void>
  signOut: () => Promise<void>
  /**
   * Delete the account and everything stored with it, on the site. "sign-in-again" when the
   * session is too old to delete without signing in again first.
   */
  deleteAccount: () => Promise<DeleteAccountResult>
}

// The site's client, which uses the session cookie. Created on first use, against the page's own origin.
let siteAuthClient: ReturnType<typeof createAuthClient> | null = null
function getSiteAuthClient() {
  siteAuthClient ??= createAuthClient({ baseURL: getApiBase() })
  return siteAuthClient
}

/** The signed-in user for the app's bearer token, or null */
async function fetchAppUser(token: string): Promise<AuthUser | null> {
  const response = await fetch(`${getApiBase()}/api/auth/get-session`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "omit",
  })
  if (!response.ok) throw new Error(`Couldn't check sign-in (${response.status})`)
  // null when the server doesn't know the token
  const data = (await response.json()) as { user?: AuthUser } | null
  return data?.user ?? null
}

/**
 * The signed-in user, with sign-in and sign-out. Uses the site's cookie, or in the extension and
 * the Mac app the bearer token of the platform set with setAuthPlatform().
 */
export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const { callbackURL = "/account" } = options
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    const platform = getAuthPlatform()
    try {
      if (!platform) {
        const { data } = await getSiteAuthClient().getSession()
        setUser(data?.user ?? null)
        return
      }
      const token = await platform.getToken()
      const appUser = token ? await fetchAppUser(token) : null
      // A token the server no longer knows (expired, or signed out on another device) is no use
      if (token && !appUser) await platform.clearToken()
      setUser(appUser)
    } catch (error) {
      // Offline: show signed out without forgetting the token
      console.error("Failed to check sign-in:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    return getAuthPlatform()?.subscribe?.(refresh)
  }, [refresh])

  const signIn = useCallback(
    async (provider: SignInProvider = "google") => {
      const platform = getAuthPlatform()
      if (!platform) {
        await getSiteAuthClient().signIn.social({ provider, callbackURL })
        return
      }
      await platform.signIn()
      await refresh()
    },
    [callbackURL, refresh],
  )

  const signOut = useCallback(async () => {
    const platform = getAuthPlatform()
    if (!platform) {
      await getSiteAuthClient().signOut()
      // The site's copy of the collections only mirrors the account, so don't leave it for
      // whoever signs in next. The apps keep theirs: they work signed out too.
      clearLocalCollections()
      setUser(null)
      return
    }
    const token = await platform.getToken()
    await platform.clearToken()
    setUser(null)
    if (token) {
      // End the session on the server too; it doesn't matter if this fails
      await fetch(`${getApiBase()}/api/auth/sign-out`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "omit",
      }).catch(() => {})
    }
  }, [])

  const deleteAccount = useCallback(async (): Promise<DeleteAccountResult> => {
    if (getAuthPlatform()) throw new Error("Accounts are deleted on the site's Account page")
    const { error } = await getSiteAuthClient().deleteUser()
    // Better Auth wants a recent sign-in (within a day) before it deletes an account
    if (error?.code === "SESSION_EXPIRED") return "sign-in-again"
    if (error) throw new Error(error.message || "Couldn't delete the account")
    clearLocalCollections()
    setUser(null)
    return "deleted"
  }, [])

  return { user, isLoading, signIn, signOut, deleteAccount }
}
