import { useState, useEffect, useMemo } from "react"
import { Settings } from "@tas/components/Settings"
import { BrowserIcon } from "@tas/components/BrowserIcon"
import { DEFAULT_SHORTCUTS, KeyboardShortcuts, BrowserType } from "@tas/types/tabs"
import { ThemeToggle } from "../../components/ThemeToggle"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { CheckCircle2, Download, ExternalLink, AlertCircle } from "lucide-react"
import { loadAndApplyTheme } from "../../utils/theme"
import "./globals.css"

function detectBrowser(): BrowserType {
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes("edg/")) return "edge"
  if (userAgent.includes("firefox")) return "firefox"
  if (userAgent.includes("safari") && !userAgent.includes("chrome")) return "safari"
  if (userAgent.includes("chrome")) return "chrome"
  return "unknown"
}

function App() {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>(DEFAULT_SHORTCUTS)
  const [nativeAppConnected, setNativeAppConnected] = useState(false)
  const browserType = useMemo(() => detectBrowser(), [])
  const isChromium = browserType === "chrome" || browserType === "edge"

  // Apply theme on mount
  useEffect(() => {
    loadAndApplyTheme()
  }, [])

  useEffect(() => {
    // Load shortcuts from storage
    browser.storage.local.get("shortcuts").then((result) => {
      if (result.shortcuts) {
        setShortcuts(result.shortcuts)
      }
    })

    // Check native app connection status
    const checkNativeApp = () => {
      browser.runtime
        .sendMessage({ type: "CHECK_NATIVE_APP" })
        .then((response) => {
          setNativeAppConnected(response?.connected || false)
        })
        .catch(() => {
          setNativeAppConnected(false)
        })
    }

    checkNativeApp()
    // Check periodically
    const interval = setInterval(checkNativeApp, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleShortcutsChange = (newShortcuts: KeyboardShortcuts) => {
    setShortcuts(newShortcuts)
    // Save to storage - auto-save on every change
    browser.storage.local.set({ shortcuts: newShortcuts })
  }

  const openShortcutsPage = () => {
    if (browserType === "edge") {
      browser.tabs.create({ url: "edge://extensions/shortcuts" })
    } else {
      browser.tabs.create({ url: "chrome://extensions/shortcuts" })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl py-8 px-4">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tab Application Switcher</h1>
            <p className="text-muted-foreground">Configure your extension settings</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Status Cards */}
        <div className="space-y-4 mb-8">
          {/* Keyboard Shortcut Configuration - only show for Chromium browsers */}
          {isChromium && (
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <BrowserIcon browser={browserType} className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <CardTitle className="text-lg">Keyboard Shortcut Configuration</CardTitle>
                    <CardDescription>Recommended: Set shortcut to "Global" scope</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    For the best experience, configure your keyboard shortcut to use "Global" scope instead of "In
                    {browserType === "edge" ? " Edge" : " Chrome"}". This fixes an issue where modifier key releases
                    aren't always detected.
                  </p>
                  <Button onClick={openShortcutsPage} variant="outline" className="gap-2">
                    <BrowserIcon browser={browserType} className="w-4 h-4" />
                    Open Keyboard Shortcuts
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Native App Status */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                {nativeAppConnected ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-orange-500 mt-1 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {nativeAppConnected ? "Native App Connected" : "Native App Not Connected"}
                  </CardTitle>
                  <CardDescription>
                    {nativeAppConnected
                      ? "You have the complete TAS experience with OS-level shortcuts"
                      : "Install the native app for enhanced experience"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            {!nativeAppConnected && (
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    The native app provides OS-level keyboard shortcuts and a system-wide overlay, just like your
                    system's application switcher.
                  </p>
                  <Button variant="outline" className="gap-2" asChild>
                    <a
                      href="https://github.com/mckinley/tab-app-switcher/releases"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="w-4 h-4" />
                      Download Native App
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Settings */}
        <div className="bg-card border rounded-lg p-6 mb-8">
          <Settings shortcuts={shortcuts} onShortcutsChange={handleShortcutsChange} />
        </div>

        {/* Help Links */}
        <div className="text-center space-y-2">
          <a
            href="https://tabappswitcher.com/getting-started"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm"
          >
            View Getting Started Guide →
          </a>
        </div>
      </div>
    </div>
  )
}

export default App
