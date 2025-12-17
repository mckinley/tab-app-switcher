import { useState, useEffect } from "react"
import { CheckCircle2, AlertCircle, Download, ExternalLink } from "lucide-react"
import { Button } from "@tab-app-switcher/ui/components/button"

// Native app download URL - points to GitHub releases
const NATIVE_APP_URL = "https://github.com/mckinley/tab-app-switcher/releases/latest"

interface NativeStatusProps {
  className?: string
}

export const NativeStatus = ({ className }: NativeStatusProps) => {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const checkNativeApp = () => {
      browser.runtime
        .sendMessage({ type: "CHECK_NATIVE_APP" })
        .then((response) => {
          setIsConnected(response?.connected || false)
        })
        .catch(() => {
          setIsConnected(false)
        })
    }

    checkNativeApp()
    const interval = setInterval(checkNativeApp, 5000)
    return () => clearInterval(interval)
  }, [])

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
            <a href={NATIVE_APP_URL} target="_blank" rel="noopener noreferrer">
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
