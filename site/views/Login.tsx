import { useEffect, useState } from "react"
import { useAuth, type SignInProvider } from "@tas/hooks/useAuth"
import { Navigation } from "@/components/Navigation"
import { Footer } from "@/components/Footer"
import { Button } from "@tab-app-switcher/ui/components/button"
import { SiApple, SiGoogle } from "@icons-pack/react-simple-icons"
import logo from "@/assets/logo.jpg"
import { safeReturnTo } from "@/lib/safeReturnTo"

export default function Login() {
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")
  const returnTo = safeReturnTo(searchParams.get("returnTo"))

  const { user, isLoading, signIn } = useAuth({
    callbackURL: returnTo,
  })

  // Sign in with Apple is offered only once it's set up on the server
  const [providers, setProviders] = useState<SignInProvider[]>(["google"])
  useEffect(() => {
    fetch("/api/sign-in-providers")
      .then((response) => (response.ok ? (response.json() as Promise<{ providers?: SignInProvider[] }>) : null))
      .then((data) => {
        if (data?.providers) setProviders(data.providers)
      })
      .catch(() => {})
  }, [])

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

          <div className="space-y-3">
            <Button onClick={() => signIn("google")} size="lg" className="w-full gap-2">
              <SiGoogle size={18} />
              Continue with Google
            </Button>
            {providers.includes("apple") && (
              <Button
                onClick={() => signIn("apple")}
                size="lg"
                className="w-full gap-2 bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
              >
                <SiApple size={18} />
                Continue with Apple
              </Button>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            By signing in, you agree to our{" "}
            <a href="/about#terms" className="underline hover:no-underline">
              terms
            </a>{" "}
            and{" "}
            <a href="/about#privacy" className="underline hover:no-underline">
              privacy policy
            </a>
            .
          </p>
        </div>
      </div>

      <Footer />
    </div>
  )
}
