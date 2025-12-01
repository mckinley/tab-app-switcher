import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Download, ExternalLink, Keyboard, Zap, Globe, Chrome } from "lucide-react"
import { ThemeToggle } from "../../components/ThemeToggle"
import { loadAndApplyTheme } from "../../utils/theme"
import { BrowserType } from "@tas/types/tabs"
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
  const [nativeAppConnected, setNativeAppConnected] = useState(false)
  const browserType = useMemo(() => detectBrowser(), [])
  const isChromium = browserType === "chrome" || browserType === "edge"

  useEffect(() => {
    loadAndApplyTheme()

    // Check if native app is connected
    browser.runtime
      .sendMessage({ type: "CHECK_NATIVE_APP" })
      .then((response) => {
        if (response?.connected) {
          setNativeAppConnected(true)
        }
      })
      .catch(() => {
        // Native app not connected
        setNativeAppConnected(false)
      })
  }, [])

  const openShortcutsPage = () => {
    if (browserType === "edge") {
      browser.tabs.create({ url: "edge://extensions/shortcuts" })
    } else {
      browser.tabs.create({ url: "chrome://extensions/shortcuts" })
    }
  }

  const openOptionsPage = () => {
    browser.tabs.create({ url: browser.runtime.getURL("/options.html") })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl py-8 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Welcome to Tab Application Switcher!</h1>
            <p className="text-muted-foreground text-lg">Let's get you set up for the best experience</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Quick Start Steps */}
        <div className="space-y-6 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <CardTitle>Extension Installed!</CardTitle>
                  <CardDescription>You can now switch tabs with Alt+Tab</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The extension is ready to use. Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Alt+Tab</kbd>{" "}
                to open the tab switcher.
              </p>
            </CardContent>
          </Card>

          {isChromium && (
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Keyboard className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <CardTitle>Recommended: Configure Keyboard Shortcut</CardTitle>
                    <CardDescription>Set shortcut to "Global" scope for best experience</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium">Why Global scope?</p>
                  <p className="text-sm text-muted-foreground">
                    {browserType === "edge" ? "Edge" : "Chrome"}'s default "In{" "}
                    {browserType === "edge" ? "Edge" : "Chrome"}" scope has a limitation: if you press Alt+Tab multiple
                    times quickly, the modifier key release isn't always detected. Setting it to "Global" fixes this
                    issue.
                  </p>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium">Steps:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Click the button below to open Keyboard Shortcuts</li>
                      <li>Find "Tab Application Switcher"</li>
                      <li>Change the dropdown from "In {browserType === "edge" ? "Edge" : "Chrome"}" to "Global"</li>
                    </ol>
                  </div>
                </div>
                <Button onClick={openShortcutsPage} className="gap-2">
                  <Chrome className="w-4 h-4" />
                  Open Keyboard Shortcuts
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                {nativeAppConnected ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                ) : (
                  <Zap className="w-6 h-6 text-orange-500 mt-1 flex-shrink-0" />
                )}
                <div>
                  <CardTitle>{nativeAppConnected ? "Native App Connected!" : "Optional: Install Native App"}</CardTitle>
                  <CardDescription>
                    {nativeAppConnected
                      ? "You have the complete TAS experience"
                      : "Enhance your experience with OS-level shortcuts"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {nativeAppConnected ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    The native app is connected and working! You now have OS-level keyboard shortcuts and a system-wide
                    overlay, just like your system's application switcher.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                    <p className="text-sm font-medium">Benefits of the Native App:</p>
                    <ul className="text-sm text-muted-foreground space-y-2 ml-2">
                      <li className="flex items-start gap-2">
                        <Globe className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>OS-level keyboard registration (no Chrome limitations)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>System-wide overlay that appears above all applications</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Works exactly like Alt+Tab on Windows or Cmd+Tab on macOS</span>
                      </li>
                    </ul>
                  </div>
                  <Button variant="outline" className="gap-2" asChild>
                    <a
                      href="https://github.com/yourusername/tab-app-switcher/releases"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="w-4 h-4" />
                      Download Native App
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-4 justify-center">
          <Button onClick={openOptionsPage} variant="outline">
            Open Settings
          </Button>
          <Button onClick={() => window.close()}>Get Started</Button>
        </div>
      </div>
    </div>
  )
}

export default App
