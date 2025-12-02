import { Link } from "react-router-dom"
import { Button } from "@tab-app-switcher/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@tab-app-switcher/ui/components/card"
import { Download, Keyboard, Zap, AlertCircle, HelpCircle } from "lucide-react"
import { BrowserIcon } from "@tas/components/BrowserIcon"
import { ThemeToggle } from "@/components/ThemeToggle"
import logo from "@/assets/logo.png"

const GettingStarted = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-8 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="TAS Logo" className="h-10 w-10 rounded-lg" />
            <span className="text-xl font-bold">Tab Application Switcher</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/downloads">
              <Button variant="ghost">Downloads</Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-foreground mb-4">Getting Started</h1>
          <p className="text-xl text-muted-foreground">
            Everything you need to know to get the most out of Tab Application Switcher
          </p>
        </div>

        {/* Installation Options */}
        <div className="space-y-8 mb-16">
          <h2 className="text-3xl font-bold text-foreground">Installation Options</h2>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <BrowserIcon browser="chrome" className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <CardTitle>Extension Only (Good)</CardTitle>
                  <CardDescription>Works entirely within your browser</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Install just the browser extension to get started quickly. You'll be able to switch between tabs using
                  keyboard shortcuts.
                </p>
                <div className="bg-muted/50 border border-border rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Features:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Alt+Tab to switch between tabs in MRU order</li>
                    <li>Works in any browser window</li>
                    <li>Customizable keyboard shortcuts</li>
                    <li>Tab search and management</li>
                  </ul>
                </div>
              </div>
              <div className="pt-2">
                <Link to="/downloads">
                  <Button className="gap-2">
                    <Download className="w-4 h-4" />
                    Install Extension
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Zap className="w-6 h-6 text-orange-500 mt-1 flex-shrink-0" />
                <div>
                  <CardTitle>Extension + Native App (Better)</CardTitle>
                  <CardDescription>Enhanced experience with OS-level shortcuts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Install both the extension and native app for the complete experience. The native app provides
                  OS-level keyboard registration and a system-wide overlay.
                </p>
                <div className="bg-muted/50 border border-border rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Additional Benefits:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>OS-level keyboard shortcuts (no Chrome limitations)</li>
                    <li>System-wide overlay above all applications</li>
                    <li>Works exactly like Alt+Tab on Windows or Cmd+Tab on macOS</li>
                    <li>More reliable modifier key detection</li>
                  </ul>
                </div>
              </div>
              <div className="pt-2">
                <Link to="/downloads">
                  <Button className="gap-2">
                    <Download className="w-4 h-4" />
                    Download Both
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration */}
        <div className="space-y-8 mb-16">
          <h2 className="text-3xl font-bold text-foreground">Configuration</h2>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Keyboard className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <CardTitle>Recommended: Set Keyboard Shortcut to Global</CardTitle>
                  <CardDescription>For the best extension-only experience</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                      Chrome has a keyboard shortcut limitation
                    </p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-500">
                      When using the default "In Chrome" scope, if you press Alt+Tab multiple times quickly, the
                      modifier key release isn't always detected. Setting it to "Global" fixes this issue.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">Steps to configure:</p>
                <ol className="text-sm text-muted-foreground space-y-2 ml-4 list-decimal">
                  <li>
                    Open <code className="px-2 py-1 bg-muted rounded text-xs">chrome://extensions/shortcuts</code> in
                    Chrome
                  </li>
                  <li>Find "Tab Application Switcher" in the list</li>
                  <li>Change the dropdown from "In Chrome" to "Global"</li>
                  <li>Test by pressing Alt+Tab multiple times quickly</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Troubleshooting */}
        <div className="space-y-8 mb-16">
          <h2 className="text-3xl font-bold text-foreground">Troubleshooting</h2>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <HelpCircle className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <CardTitle>Common Issues</CardTitle>
                  <CardDescription>Solutions to frequently encountered problems</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">Extension doesn't respond to Alt+Tab</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>Make sure the extension is installed and enabled</li>
                  <li>Check that the keyboard shortcut is configured in chrome://extensions/shortcuts</li>
                  <li>Try setting the shortcut scope to "Global" instead of "In Chrome"</li>
                  <li>Restart Chrome after making changes</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Modifier key release not detected</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>This is a known Chrome limitation with "In Chrome" scope</li>
                  <li>Change the keyboard shortcut scope to "Global" in chrome://extensions/shortcuts</li>
                  <li>Alternatively, install the native app for OS-level keyboard handling</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Native app not connecting to extension</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>Make sure both the extension and native app are installed</li>
                  <li>Check that Chrome is running</li>
                  <li>Restart the native app from the system tray</li>
                  <li>Check the native app tray menu for connection status</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Native app installed but extension not installed</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>The native app requires the extension to get tab data</li>
                  <li>Install the extension from the Chrome Web Store</li>
                  <li>The native app will automatically connect once the extension is installed</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="space-y-8 mb-16">
          <h2 className="text-3xl font-bold text-foreground">How It Works</h2>

          <Card>
            <CardHeader>
              <CardTitle>Extension Only Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The browser extension tracks your tabs in Most Recently Used (MRU) order. When you press Alt+Tab, it
                opens a popup showing your tabs sorted by when you last used them. Press Tab to cycle through tabs, then
                release Alt to switch to the selected tab.
              </p>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Technical Details:</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>Uses Chrome's tabs API to track tab activation</li>
                  <li>Persists MRU order in local storage</li>
                  <li>Keyboard shortcuts registered via Chrome's commands API</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Extension + Native App Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The native app runs in your system tray and communicates with the extension via WebSocket. It registers
                Alt+Tab at the OS level and displays a system-wide overlay when activated. The extension provides the
                tab data and handles tab switching.
              </p>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Technical Details:</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>Native app built with Electron</li>
                  <li>WebSocket connection on localhost:48125</li>
                  <li>OS-level global keyboard shortcuts via Electron's globalShortcut API</li>
                  <li>Frameless, transparent overlay window</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer CTA */}
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-border rounded-xl p-12 text-center space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Ready to get started?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Download the extension and optionally the native app to enhance your tab switching experience
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/downloads">
              <Button size="lg" className="gap-2">
                <Download className="w-5 h-5" />
                Go to Downloads
              </Button>
            </Link>
            <Link to="/">
              <Button size="lg" variant="outline">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GettingStarted
