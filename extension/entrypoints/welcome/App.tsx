import { useState, useEffect } from "react"
import { Button } from "@tab-app-switcher/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@tab-app-switcher/ui/components/card"
import { CheckCircle2, Download, ExternalLink, Keyboard, Zap, Globe, Pin } from "lucide-react"
import { BrowserIcon } from "@tas/components/BrowserIcon"
import { ExtensionPlatformProvider, useBrowser } from "../../lib/platform"
import { pinInstructions, useToolbarPinned } from "../../lib/hooks/useToolbarPinned"
import "./globals.css"

function WelcomeContent() {
  const [nativeAppConnected, setNativeAppConnected] = useState(false)
  const { browserType, openShortcutsPage } = useBrowser()
  const isChromium = browserType === "chrome" || browserType === "edge"
  const browserName = browserType === "edge" ? "Edge" : "Chrome"
  const shortcut = useActivateShortcut(isChromium ? "Alt+Tab" : "Alt+1")
  const pinned = useToolbarPinned()

  useEffect(() => {
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

  const openOptionsPage = () => {
    browser.tabs.create({ url: browser.runtime.getURL("/options.html") })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome to Tab Application Switcher!</h1>
          <p className="text-muted-foreground text-lg">Let's get you set up for the best experience</p>
        </div>

        {/* Quick Start Steps */}
        <div className="space-y-6 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <CardTitle>Extension Installed!</CardTitle>
                  <CardDescription>You can now switch tabs with {shortcut}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The extension is ready to use. Press{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs">{shortcut}</kbd> to open the tab switcher.
              </p>
            </CardContent>
          </Card>

          {pinned !== undefined && (
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  {pinned ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  ) : (
                    <Pin className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
                  )}
                  <div>
                    <CardTitle>{pinned ? "Pinned to the Toolbar" : "Pin the Extension"}</CardTitle>
                    <CardDescription>So the switcher opens the moment you press {shortcut}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {pinned
                    ? "The switcher opens instantly."
                    : `While the extension is hidden in the Extensions menu, ${browserName} plays a short animation before it opens the switcher. ${pinInstructions(browserType)}`}
                </p>
              </CardContent>
            </Card>
          )}

          {isChromium && (
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Keyboard className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <CardTitle>Keyboard Shortcut</CardTitle>
                    <CardDescription>Keep the shortcut's scope set to "In {browserName}"</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    With the default "In {browserName}" scope, every {browserName} profile gets its own {shortcut}, and
                    pressing Tab several times while holding Alt works.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Avoid "Global": only one {browserName} profile can own a global shortcut, so {shortcut} would always
                    open that profile's tabs, and it can clash with the native app's {shortcut}.
                  </p>
                  <p className="text-sm text-muted-foreground">You can change the key itself on the shortcuts page.</p>
                </div>
                <Button onClick={openShortcutsPage} variant="outline" className="gap-2">
                  <BrowserIcon browser={browserType} className="w-4 h-4" />
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
                    <a href="https://tabappswitcher.com/downloads" target="_blank" rel="noopener noreferrer">
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

/**
 * The key the extension's shortcut is set to, as the browser reports it
 */
function useActivateShortcut(fallback: string): string {
  const [shortcut, setShortcut] = useState(fallback)
  useEffect(() => {
    browser.commands
      .getAll()
      .then((commands) => {
        const key = commands.find((c) => c.name === "tas_activate")?.shortcut
        if (key) setShortcut(key)
      })
      .catch(() => {})
  }, [])
  return shortcut
}

function App() {
  return (
    <ExtensionPlatformProvider>
      <WelcomeContent />
    </ExtensionPlatformProvider>
  )
}

export default App
