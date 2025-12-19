/**
 * NativeKeyboardNotes - Notes about keyboard accessibility permissions for native app
 *
 * Shows instructions for granting accessibility permissions required for
 * system-wide keyboard shortcuts on macOS.
 */
import { ExternalLink, Shield } from "lucide-react"
import { Button } from "@tab-app-switcher/ui/components/button"

export interface NativeKeyboardNotesProps {
  /** Callback to open system accessibility settings */
  onOpenAccessibility?: () => void
  /** Additional CSS classes */
  className?: string
}

export const NativeKeyboardNotes = ({ onOpenAccessibility, className }: NativeKeyboardNotesProps) => {
  const handleOpenAccessibility = () => {
    if (onOpenAccessibility) {
      onOpenAccessibility()
    } else {
      // Fallback: open macOS Privacy & Security settings URL
      window.open("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility", "_blank")
    }
  }

  return (
    <div className={className}>
      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Accessibility Permissions</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tab Application Switcher requires Accessibility permissions to register system-wide keyboard shortcuts.
              Grant access in System Settings → Privacy & Security → Accessibility.
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleOpenAccessibility} className="gap-2">
          <Shield className="w-4 h-4" />
          Open Accessibility Settings
          <ExternalLink className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}
