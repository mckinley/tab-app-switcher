/**
 * ExtensionConnectionStatus - Shows native app connection status in the extension
 *
 * Displays whether the native app is connected and provides a download link
 * if not connected. Used in the extension's Connection settings tab.
 */
import { CheckCircle2, AlertCircle, Download, ExternalLink } from "lucide-react"
import { Button } from "@tab-app-switcher/ui/components/button"

// Default download URL
const DEFAULT_DOWNLOAD_URL = "https://github.com/anthropics/tab-app-switcher/releases/latest"

export interface ExtensionConnectionStatusProps {
  /** Whether the native app is connected */
  isConnected: boolean
  /** URL to download the native app */
  downloadUrl?: string
  /** Additional CSS classes */
  className?: string
}

export const ExtensionConnectionStatus = ({
  isConnected,
  downloadUrl = DEFAULT_DOWNLOAD_URL,
  className,
}: ExtensionConnectionStatusProps) => {
  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Status Indicator */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
          {isConnected ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Native App Connected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You have the complete TAS experience with OS-level shortcuts
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Native App Not Connected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Install the native app for OS-level keyboard shortcuts and a system-wide overlay
                </p>
              </div>
            </>
          )}
        </div>

        {/* Download Button (only show when not connected) */}
        {!isConnected && (
          <Button variant="outline" className="w-full gap-2" asChild>
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4" />
              Download Native App
              <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
        )}

        {/* Benefits */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-medium text-muted-foreground">Benefits of the native app:</p>
          <ul className="text-xs text-muted-foreground space-y-1 pl-4">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>System-wide Alt+Tab style keyboard shortcuts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Native overlay that works like your OS app switcher</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Works even when the browser is not focused</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
