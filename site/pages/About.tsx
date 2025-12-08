import { useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { Navigation, SubnavItem } from "@/components/Navigation"
import { Footer } from "@/components/Footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@tab-app-switcher/ui/components/card"
import { Button } from "@tab-app-switcher/ui/components/button"
import { Download, Keyboard, Zap, AlertCircle, HelpCircle } from "lucide-react"
import { BrowserIcon } from "@tas/components/BrowserIcon"

const subnavItems: SubnavItem[] = [
  { to: "/about#getting-started", label: "Getting Started" },
  { to: "/about#pricing", label: "Pricing" },
  { to: "/about#history", label: "History" },
  { to: "/about#compare", label: "Compare" },
  { to: "/about#terms", label: "Terms of Service" },
  { to: "/about#support", label: "Support" },
]

export default function About() {
  const location = useLocation()

  // Scroll to hash on load or hash change
  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash)
      if (element) {
        element.scrollIntoView({ behavior: "smooth" })
      }
    }
  }, [location.hash])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation subnavItems={subnavItems} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-12 space-y-16">
        {/* Getting Started */}
        <section id="getting-started" className="scroll-mt-32 space-y-8">
          <h2 className="text-3xl font-bold">Getting Started</h2>

          {/* Quick Start */}
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-lg text-muted-foreground">
              Tab Application Switcher works like your operating system's application switcher (Alt+Tab on Windows,
              Cmd+Tab on Mac), but for your browser tabs.
            </p>
            <ol className="mt-4 space-y-3 text-muted-foreground">
              <li>
                <strong>Install the browser extension</strong> from your browser's extension store
              </li>
              <li>
                <strong>Press Alt+Tab</strong> (or your configured shortcut) to open the tab switcher
              </li>
              <li>
                <strong>Keep Alt held</strong> and press Tab to cycle through tabs in most-recently-used order
              </li>
              <li>
                <strong>Release Alt</strong> to switch to the selected tab
              </li>
            </ol>
          </div>

          {/* Installation Options */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Installation Options</h3>

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
                <Link to="/downloads">
                  <Button className="gap-2">
                    <Download className="w-4 h-4" />
                    Install Extension
                  </Button>
                </Link>
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
                <Link to="/downloads">
                  <Button className="gap-2">
                    <Download className="w-4 h-4" />
                    Download Both
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Configuration */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Configuration</h3>

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
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Troubleshooting</h3>

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
              </CardContent>
            </Card>
          </div>

          {/* How It Works */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">How It Works</h3>

            <Card>
              <CardHeader>
                <CardTitle>Extension Only Mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  The browser extension tracks your tabs in Most Recently Used (MRU) order. When you press Alt+Tab, it
                  opens a popup showing your tabs sorted by when you last used them. Press Tab to cycle through tabs,
                  then release Alt to switch to the selected tab.
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
                  The native app runs in your system tray and communicates with the extension via WebSocket. It
                  registers Alt+Tab at the OS level and displays a system-wide overlay when activated. The extension
                  provides the tab data and handles tab switching.
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
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-32">
          <h2 className="text-3xl font-bold mb-6">Pricing</h2>
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-border rounded-xl p-8">
            <p className="text-2xl font-semibold mb-2">Free & Open Source</p>
            <p className="text-muted-foreground">
              Tab Application Switcher is completely free and open source. No subscriptions, no premium tiers, no data
              collection.
            </p>
            <p className="mt-4 text-muted-foreground">
              The source code is available on{" "}
              <a
                href="https://github.com/mckinley/tab-app-switcher"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline hover:no-underline"
              >
                GitHub
              </a>
              .
            </p>
          </div>
        </section>

        {/* History */}
        <section id="history" className="scroll-mt-32">
          <h2 className="text-3xl font-bold mb-6">History</h2>
          <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground">
            <p>
              Tab Application Switcher was created to solve a simple problem: switching between browser tabs should be
              as fast and intuitive as switching between applications.
            </p>
            <p className="mt-4">
              Modern browsers have dozens of tabs open, but navigating between them requires clicking or using Ctrl+Tab
              which cycles in order, not by recency. This extension brings the familiar Alt+Tab experience to your
              browser.
            </p>
          </div>
        </section>

        {/* Compare */}
        <section id="compare" className="scroll-mt-32">
          <h2 className="text-3xl font-bold mb-6">Compare</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pr-4 font-medium">Feature</th>
                  <th className="text-center py-3 px-4 font-medium">TAS</th>
                  <th className="text-center py-3 px-4 font-medium">Browser Ctrl+Tab</th>
                  <th className="text-center py-3 px-4 font-medium">Other Extensions</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4">MRU (Most Recently Used) order</td>
                  <td className="text-center py-3 px-4">✓</td>
                  <td className="text-center py-3 px-4">✗</td>
                  <td className="text-center py-3 px-4">Some</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4">Visual preview while switching</td>
                  <td className="text-center py-3 px-4">✓</td>
                  <td className="text-center py-3 px-4">✗</td>
                  <td className="text-center py-3 px-4">Some</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4">Native app with OS-level shortcuts</td>
                  <td className="text-center py-3 px-4">✓</td>
                  <td className="text-center py-3 px-4">✗</td>
                  <td className="text-center py-3 px-4">✗</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4">Tab collections with cloud sync</td>
                  <td className="text-center py-3 px-4">✓</td>
                  <td className="text-center py-3 px-4">✗</td>
                  <td className="text-center py-3 px-4">Some</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Free & open source</td>
                  <td className="text-center py-3 px-4">✓</td>
                  <td className="text-center py-3 px-4">✓</td>
                  <td className="text-center py-3 px-4">Varies</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Terms of Service */}
        <section id="terms" className="scroll-mt-32">
          <h2 className="text-3xl font-bold mb-6">Terms of Service</h2>
          <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground">
            <p>
              Tab Application Switcher is provided "as is" without warranty of any kind. By using this software, you
              agree to use it at your own risk.
            </p>
            <p className="mt-4">
              We do not collect personal data. If you sign in to sync collections, your data is stored securely and used
              only for the sync functionality.
            </p>
          </div>
        </section>

        {/* Support */}
        <section id="support" className="scroll-mt-32">
          <h2 className="text-3xl font-bold mb-6">Support</h2>
          <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground">
            <p>Need help? Here are your options:</p>
            <ul className="mt-4 space-y-2">
              <li>
                <a
                  href="https://github.com/mckinley/tab-app-switcher/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline hover:no-underline"
                >
                  Report a bug or request a feature
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/mckinley/tab-app-switcher/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline hover:no-underline"
                >
                  Join the discussion
                </a>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
