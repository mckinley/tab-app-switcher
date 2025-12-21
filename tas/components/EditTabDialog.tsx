import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@tab-app-switcher/ui/components/dialog"
import { Button } from "@tab-app-switcher/ui/components/button"
import { Input } from "@tab-app-switcher/ui/components/input"
import { Label } from "@tab-app-switcher/ui/components/label"
import { Trash2 } from "lucide-react"
import type { CollectionTab } from "../types/collections"
import { TabFavicon } from "./TabFavicon"
import { isValidUrl } from "../utils/faviconFetcher"

interface EditTabDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tab: CollectionTab | null
  onSave: (updates: { url?: string; title?: string }) => void
  onDelete: () => void
  isLoading?: boolean
}

export const EditTabDialog = ({ open, onOpenChange, tab, onSave, onDelete, isLoading = false }: EditTabDialogProps) => {
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (tab) {
      setUrl(tab.url)
      setTitle(tab.title)
      setError("")
    }
  }, [tab])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tab) return
    setError("")

    if (!url.trim()) {
      setError("URL is required")
      return
    }

    if (!isValidUrl(url.trim())) {
      setError("Please enter a valid URL")
      return
    }

    const updates: { url?: string; title?: string } = {}
    if (url.trim() !== tab.url) {
      updates.url = url.trim()
    }
    if (title.trim() !== tab.title) {
      updates.title = title.trim()
    }

    if (Object.keys(updates).length > 0) {
      onSave(updates)
    } else {
      onOpenChange(false)
    }
  }

  const handleDelete = () => {
    onDelete()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" aria-describedby={undefined}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {tab && <TabFavicon src={tab.favicon} className="w-5 h-5" />}
              Edit Tab
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tab title"
                autoFocus
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-url">URL</Label>
              <Input
                id="edit-url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setError("")
                }}
                placeholder="https://example.com"
                disabled={isLoading}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <p className="text-xs text-muted-foreground">Changing the URL will update the favicon</p>
            </div>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isLoading}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
