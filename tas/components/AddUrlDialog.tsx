import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@tab-app-switcher/ui/components/dialog"
import { Button } from "@tab-app-switcher/ui/components/button"
import { Input } from "@tab-app-switcher/ui/components/input"
import { Label } from "@tab-app-switcher/ui/components/label"
import { isValidUrl } from "../utils/faviconFetcher"

interface AddUrlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (url: string, title?: string) => void
  isLoading?: boolean
}

export const AddUrlDialog = ({ open, onOpenChange, onAdd, isLoading = false }: AddUrlDialogProps) => {
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!url.trim()) {
      setError("URL is required")
      return
    }

    if (!isValidUrl(url.trim())) {
      setError("Please enter a valid URL")
      return
    }

    onAdd(url.trim(), title.trim() || undefined)
    setUrl("")
    setTitle("")
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setUrl("")
      setTitle("")
      setError("")
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]" aria-describedby={undefined}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setError("")
                }}
                placeholder="https://example.com"
                autoFocus
                disabled={isLoading}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-generated from URL"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
