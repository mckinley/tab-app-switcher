/**
 * NativeConnectionStatus - Browser extension connection status in the native app
 *
 * Shows which browser extensions are connected to the native app and provides
 * links to install extensions for each browser. Used in the native app's Connection tab.
 */
import { useEffect, useState } from "react"
import { Button } from "@tab-app-switcher/ui/components/button"
import { Separator } from "@tab-app-switcher/ui/components/separator"

// Extension store URLs
const CHROME_EXTENSION_ID = "mfcjanplaceclfoipcengelejgfngcan"
const EDGE_EXTENSION_ID = "epfinbjjhhlpbfcdmdhnddbjebmbkjck"

const EXTENSION_URLS = {
  chrome: `https://chromewebstore.google.com/detail/${CHROME_EXTENSION_ID}`,
  firefox: "https://addons.mozilla.org/firefox/addon/tab-application-switcher/",
  edge: `https://microsoftedge.microsoft.com/addons/detail/${EDGE_EXTENSION_ID}`,
  safari: "https://apps.apple.com/app/tab-application-switcher/id6756280616",
} as const

export interface ConnectionStatus {
  connected: boolean
  sessionCount: number
  browsers: Array<{
    browser: string
    tabCount: number
  }>
}

export interface NativeConnectionStatusProps {
  /** Callback to open external URLs (defaults to window.open) */
  onOpenExternal?: (url: string) => void
  /** Callback to get connection status */
  getConnectionStatus?: () => Promise<ConnectionStatus>
  /** Additional CSS classes */
  className?: string
}

export const NativeConnectionStatus = ({
  onOpenExternal,
  getConnectionStatus,
  className,
}: NativeConnectionStatusProps) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)

  useEffect(() => {
    const loadStatus = async (): Promise<void> => {
      try {
        if (getConnectionStatus) {
          const status = await getConnectionStatus()
          setConnectionStatus(status)
        }
      } catch (error) {
        console.error("Failed to get connection status:", error)
      }
    }

    loadStatus()

    // Poll for updates every 2 seconds
    const interval = setInterval(loadStatus, 2000)
    return () => clearInterval(interval)
  }, [getConnectionStatus])

  const handleOpenUrl = (url: string): void => {
    if (onOpenExternal) {
      onOpenExternal(url)
    } else {
      window.open(url, "_blank")
    }
  }

  const formatBrowserName = (browser: string): string => {
    const names: Record<string, string> = {
      chrome: "Chrome",
      firefox: "Firefox",
      edge: "Edge",
      safari: "Safari",
      unknown: "Browser",
    }
    return names[browser] || browser.charAt(0).toUpperCase() + browser.slice(1)
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Connection Status */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">Connection Status</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Browser extensions connected to this app</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            {connectionStatus === null ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : connectionStatus.connected ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">
                    {connectionStatus.sessionCount === 1
                      ? "1 browser connected"
                      : `${connectionStatus.sessionCount} browsers connected`}
                  </span>
                </div>
                <div className="pl-4 space-y-1">
                  {connectionStatus.browsers.map((b, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {formatBrowserName(b.browser)} - {b.tabCount} tabs
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-sm text-muted-foreground">No browsers connected</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Install Extensions */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">Install Browser Extension</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Install the extension in your browser to enable tab switching
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1"
              onClick={() => handleOpenUrl(EXTENSION_URLS.chrome)}
            >
              <ChromeIcon className="w-6 h-6" />
              <span className="text-xs">Chrome</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1"
              onClick={() => handleOpenUrl(EXTENSION_URLS.firefox)}
            >
              <FirefoxIcon className="w-6 h-6" />
              <span className="text-xs">Firefox</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1"
              onClick={() => handleOpenUrl(EXTENSION_URLS.edge)}
            >
              <EdgeIcon className="w-6 h-6" />
              <span className="text-xs">Edge</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1"
              onClick={() => handleOpenUrl(EXTENSION_URLS.safari)}
            >
              <SafariIcon className="w-6 h-6" />
              <span className="text-xs">Safari</span>
            </Button>
          </div>
        </div>

        <Separator />

        {/* How It Works */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">How It Works</h3>

          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex gap-3">
              <span className="text-sm font-medium text-muted-foreground">1.</span>
              <p className="text-sm text-muted-foreground">
                Install the browser extension in Chrome, Firefox, Edge, or Safari
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-sm font-medium text-muted-foreground">2.</span>
              <p className="text-sm text-muted-foreground">Keep this native app running in your menu bar</p>
            </div>
            <div className="flex gap-3">
              <span className="text-sm font-medium text-muted-foreground">3.</span>
              <p className="text-sm text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 bg-background rounded text-xs font-mono">Alt+Tab</kbd> to switch
                between your browser tabs like native apps
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple browser icons as SVG components
function ChromeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  )
}

function FirefoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 6c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6z" fill="currentColor" opacity="0.3" />
    </svg>
  )
}

function EdgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12a4 4 0 108 0 4 4 0 00-8 0z" fill="currentColor" opacity="0.3" />
    </svg>
  )
}

function SafariIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  )
}
