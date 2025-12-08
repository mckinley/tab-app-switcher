import { useEffect, useState, useCallback } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "../utils/supabase"
import { signInWithGoogle, signOut as authSignOut } from "../utils/collectionsSync"

interface UseAuthOptions {
  /** URL to redirect to after OAuth (defaults to window.location.origin) */
  redirectUrl?: string
}

interface UseAuthReturn {
  user: User | null
  isLoading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const { redirectUrl } = options
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Handle OAuth callback - check for tokens in URL hash
    const handleOAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")

      if (accessToken && refreshToken) {
        // Set the session from URL tokens
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (!error) {
          // Clean up URL by removing hash
          window.history.replaceState(null, "", window.location.pathname)
        }
      }
    }

    // First handle any OAuth callback, then get session
    handleOAuthCallback().then(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setIsLoading(false)
      })
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async () => {
    await signInWithGoogle(redirectUrl)
  }, [redirectUrl])

  const signOut = useCallback(async () => {
    await authSignOut()
  }, [])

  return { user, isLoading, signIn, signOut }
}
