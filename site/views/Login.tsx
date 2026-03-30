import { useEffect } from "react"
import { useAuth } from "@tas/hooks/useAuth"
import { Navigation } from "@/components/Navigation"
import { Footer } from "@/components/Footer"
import { Button } from "@tab-app-switcher/ui/components/button"
import { SiGoogle } from "@icons-pack/react-simple-icons"
import logo from "@/assets/logo.jpg"

export default function Login() {
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")
  const returnTo = searchParams.get("returnTo") || "/account"

  const { user, isLoading, signIn } = useAuth({
    callbackURL: returnTo,
  })

  // Redirect to returnTo if already signed in
  useEffect(() => {
    if (!isLoading && user) {
      window.location.href = returnTo
    }
  }, [isLoading, user, returnTo])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-4">
            <a href="/" className="inline-block">
              <img
                src={typeof logo === "string" ? logo : logo.src}
                alt="Tab Application Switcher"
                className="w-16 h-16 rounded-xl mx-auto"
              />
            </a>
            <h1 className="text-2xl font-bold">Sign in</h1>
            <p className="text-muted-foreground">Sign in to sync your tab collections across devices</p>
          </div>

          <Button onClick={signIn} size="lg" className="w-full gap-2">
            <SiGoogle size={18} />
            Continue with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">By signing in, you agree to our terms of service.</p>
        </div>
      </div>

      <Footer />
    </div>
  )
}
