/**
 * ExtensionKeyboardNotes - Browser-specific keyboard shortcut configuration notes
 *
 * Shows instructions for configuring keyboard shortcuts based on the detected browser.
 * Each browser has different requirements for optimal keyboard shortcut behavior.
 */
import { ExternalLink } from "lucide-react"
import { Button } from "@tab-app-switcher/ui/components/button"
import { BrowserIcon } from "../BrowserIcon"
import type { BrowserType } from "../../types/tabs"

export interface ExtensionKeyboardNotesProps {
  /** The detected browser type */
  browserType: BrowserType
  /** Callback to open the shortcuts configuration page */
  onOpenShortcuts: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Get browser-specific keyboard shortcut instructions
 */
function getBrowserInstructions(browserType: BrowserType): {
  title: string
  description: string
  buttonLabel: string
  showButton: boolean
} | null {
  switch (browserType) {
    case "chrome":
      return {
        title: "Chrome Keyboard Shortcuts",
        description:
          'Keep the shortcut\'s scope set to "In Chrome" (the default) so every Chrome profile gets its own shortcut. "Global" only works in one profile and can clash with the native app.',
        buttonLabel: "Open Chrome Shortcuts",
        showButton: true,
      }
    case "edge":
      return {
        title: "Edge Keyboard Shortcuts",
        description:
          'Keep the shortcut\'s scope set to "In Edge" (the default) so every Edge profile gets its own shortcut. "Global" only works in one profile and can clash with the native app.',
        buttonLabel: "Open Edge Shortcuts",
        showButton: true,
      }
    case "firefox":
      return {
        title: "Firefox Keyboard Shortcuts",
        description:
          "Change the shortcut in Firefox's Add-ons Manager: open the gear menu and choose Manage Extension Shortcuts.",
        buttonLabel: "Manage Extension Shortcuts",
        showButton: true,
      }
    case "safari":
      return {
        title: "Safari Keyboard Shortcuts",
        description:
          "Safari extension shortcuts are managed through System Settings → Keyboard → Keyboard Shortcuts → App Shortcuts.",
        buttonLabel: "",
        showButton: false,
      }
    default:
      return null
  }
}

export const ExtensionKeyboardNotes = ({ browserType, onOpenShortcuts, className }: ExtensionKeyboardNotesProps) => {
  const instructions = getBrowserInstructions(browserType)

  // Don't show for unknown browsers
  if (!instructions) {
    return null
  }

  return (
    <div className={className}>
      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-3">
        <div className="flex items-start gap-3">
          <BrowserIcon browser={browserType} className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">{instructions.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{instructions.description}</p>
          </div>
        </div>

        {instructions.showButton && (
          <Button variant="outline" size="sm" onClick={onOpenShortcuts} className="gap-2">
            <BrowserIcon browser={browserType} className="w-4 h-4" />
            {instructions.buttonLabel}
            <ExternalLink className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
