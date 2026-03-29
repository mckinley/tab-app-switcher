import { useEffect, useState, useCallback } from "react"
import { createAuthClient } from "better-auth/client"

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

interface UseAuthReturn {
  user: AuthUser | null
  isLoading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "https://tabappswitcher.com",
})

export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const { callbackURL = "/account" } = options
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check current session
    authClient.getSession().then(({ data }) => {
      setUser(data?.user ?? null)
      setIsLoading(false)
    })
  }, [])

  const signIn = useCallback(async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL,
    })
  }, [callbackURL])

  const signOut = useCallback(async () => {
    await authClient.signOut()
    setUser(null)
  }, [])

  return { user, isLoading, signIn, signOut }
}
