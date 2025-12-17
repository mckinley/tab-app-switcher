import { useMemo } from "react"
import { ExternalLink } from "lucide-react"
import { Button } from "@tab-app-switcher/ui/components/button"
import { BrowserIcon } from "@tas/components/BrowserIcon"
import { BrowserType } from "@tas/types/tabs"

function detectBrowser(): BrowserType {
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes("edg/")) return "edge"
  if (userAgent.includes("firefox")) return "firefox"
  if (userAgent.includes("safari") && !userAgent.includes("chrome")) return "safari"
  if (userAgent.includes("chrome")) return "chrome"
  return "unknown"
}

interface ChromiumShortcutNoteProps {
  className?: string
}

export const ChromiumShortcutNote = ({ className }: ChromiumShortcutNoteProps) => {
  const browserType = useMemo(() => detectBrowser(), [])
  const isChromium = browserType === "chrome" || browserType === "edge"

  // Only show for Chromium browsers
  if (!isChromium) {
    return null
  }

  const openShortcutsPage = () => {
    if (browserType === "edge") {
      browser.tabs.create({ url: "edge://extensions/shortcuts" })
    } else {
      browser.tabs.create({ url: "chrome://extensions/shortcuts" })
    }
  }

  const browserName = browserType === "edge" ? "Edge" : "Chrome"

  return (
    <div className={className}>
      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-3">
        <div className="flex items-start gap-3">
          <BrowserIcon browser={browserType} className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Keyboard Shortcut Configuration</p>
            <p className="text-xs text-muted-foreground mt-1">
              For the best experience, configure your keyboard shortcut to use "Global" scope instead of "In{" "}
              {browserName}". This fixes an issue where modifier key releases aren't always detected.
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={openShortcutsPage} className="gap-2">
          <BrowserIcon browser={browserType} className="w-4 h-4" />
          Open Keyboard Shortcuts
          <ExternalLink className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}
