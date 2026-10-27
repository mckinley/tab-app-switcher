import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@tab-app-switcher/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@tab-app-switcher/ui/components/dialog"
import { useAuth } from "@tas/hooks/useAuth"
import { useCollectionsSync } from "@tas/hooks/useCollectionsSync"
import { loadCollections } from "@tas/utils/collectionsStorage"
import { cn } from "@tab-app-switcher/ui/lib/utils"
import { Navigation, type SubnavItem } from "@/components/Navigation"
import { Footer } from "@/components/Footer"

const subnavItems: SubnavItem[] = [
  { href: "/account", label: "Account" },
  { href: "/collections", label: "Collections" },
]

/** ?delete=confirm: back from signing in again to delete the account, so ask once more */
const DELETE_PARAM = "delete"

const Account = () => {
  const { user, isLoading, signOut, deleteAccount } = useAuth()
  const [collections, setCollections] = useState(() => loadCollections([]))
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  // Deleted, or on the way to sign in again: either way, don't send them to the sign-in page
  const [leaving, setLeaving] = useState<"deleted" | "sign-in-again" | null>(null)

  const { refreshFromCloud } = useCollectionsSync({
    user,
    collections,
    setCollections,
  })

  // Redirect to login if not signed in
  useEffect(() => {
    if (!isLoading && !user && !leaving) {
      window.location.href = "/login?returnTo=/account"
    }
  }, [isLoading, user, leaving])

  useEffect(() => {
    if (!user) return
    const url = new URL(window.location.href)
    if (url.searchParams.get(DELETE_PARAM) !== "confirm") return
    url.searchParams.delete(DELETE_PARAM)
    window.history.replaceState(null, "", url.pathname + url.search)
    setIsDeleteOpen(true)
  }, [user])

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError("")
    try {
      const result = await deleteAccount()
      if (result === "deleted") {
        setLeaving("deleted")
        setIsDeleteOpen(false)
        return
      }
      // Signing out and in again makes a fresh session, which can delete the account
      setLeaving("sign-in-again")
      await signOut()
      window.location.href = `/login?returnTo=${encodeURIComponent(`/account?${DELETE_PARAM}=confirm`)}`
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Couldn't delete your account. Try again.")
    } finally {
      setIsDeleting(false)
    }
  }

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

  if (leaving === "deleted") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-12 w-full">
          <h1 className="text-3xl font-bold text-foreground mb-4">Account deleted</h1>
          <p className="text-muted-foreground mb-6">
            Your account and the collections saved with it have been deleted. Collections kept in the extension or the
            Mac app stay on that device until you remove them there.
          </p>
          <Button asChild variant="outline">
            <a href="/">Back to the home page</a>
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  const avatarUrl = user.image
  const userName = user.name || user.email

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation subnavItems={subnavItems} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-12 w-full">
        <h1 className="text-3xl font-bold text-foreground mb-8">Account</h1>

        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName || "User"} className="w-16 h-16 shrink-0 rounded-full" />
              ) : (
                <div className="w-16 h-16 shrink-0 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-2xl font-semibold text-muted-foreground">
                    {userName?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-foreground break-words">{userName}</h2>
                <p className="text-muted-foreground break-words">{user.email}</p>
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

          {/* Delete Account */}
          <div className="bg-card border border-destructive/40 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Delete Account</h3>
            <p className="text-muted-foreground mb-4">
              Permanently delete your account and the collections synced to it, and sign out everywhere.
            </p>
            <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
              Delete Account
            </Button>
          </div>
        </div>
      </main>

      <Dialog open={isDeleteOpen} onOpenChange={(open) => !isDeleting && setIsDeleteOpen(open)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This deletes {user.email}, the collections synced to it and every signed-in session, right away. It can't
              be undone. If you signed in more than a day ago, you'll be asked to sign in again first.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}

export default Account
