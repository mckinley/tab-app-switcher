import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { RefreshCw } from "lucide-react"
import { Button } from "@tab-app-switcher/ui/components/button"
import { useAuth } from "@tas/hooks/useAuth"
import { useCollectionsSync } from "@tas/hooks/useCollectionsSync"
import { loadCollections } from "@tas/utils/collectionsStorage"
import { cn } from "@tab-app-switcher/ui/lib/utils"
import { Navigation, SubnavItem } from "@/components/Navigation"
import { Footer } from "@/components/Footer"

const subnavItems: SubnavItem[] = [
  { to: "/account", label: "Account" },
  { to: "/collections", label: "Collections" },
]

const Account = () => {
  const navigate = useNavigate()
  const { user, isLoading, signOut } = useAuth()
  const [collections, setCollections] = useState(() => loadCollections([]))
  const [isSyncing, setIsSyncing] = useState(false)

  const { refreshFromCloud } = useCollectionsSync({
    user,
    collections,
    setCollections,
  })

  // Redirect to login if not signed in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login?returnTo=/account")
    }
  }, [isLoading, user, navigate])

  const handleRefreshFromCloud = async () => {
    setIsSyncing(true)
    try {
      await refreshFromCloud()
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation subnavItems={subnavItems} />
        <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-16">
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  const avatarUrl = user.user_metadata?.avatar_url
  const userName = user.user_metadata?.full_name || user.email

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation subnavItems={subnavItems} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">Account</h1>

        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName || "User"} className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-2xl font-semibold text-muted-foreground">
                    {userName?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-foreground">{userName}</h2>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Sync Card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Cloud Sync</h3>
            <p className="text-muted-foreground mb-4">
              Your collections are automatically synced across all your devices when you're signed in.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefreshFromCloud} disabled={isSyncing}>
                <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
            </div>
          </div>

          {/* Sign Out */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Sign Out</h3>
            <p className="text-muted-foreground mb-4">Sign out of your account on this device.</p>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Account
