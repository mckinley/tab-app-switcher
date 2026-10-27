import { useEffect } from "react"
import { Navigation, type SubnavItem } from "@/components/Navigation"
import { Footer } from "@/components/Footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@tab-app-switcher/ui/components/card"
import { Button } from "@tab-app-switcher/ui/components/button"
import { Download, Keyboard, Zap, AlertCircle, HelpCircle, Repeat, Unlock, Grid2x2, Database } from "lucide-react"
import { BrowserIcon } from "@tas/components/BrowserIcon"

const subnavItems: SubnavItem[] = [
  { href: "/about#getting-started", label: "Getting Started" },
  { href: "/about#pricing", label: "Pricing" },
  { href: "/about#history", label: "History" },
  { href: "/about#compare", label: "Compare" },
  { href: "/about#terms", label: "Terms of Service" },
  { href: "/about#privacy", label: "Privacy" },
  { href: "/about#support", label: "Support" },
]

export default function About() {
  // Scroll to hash on load or hash change
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      const element = document.querySelector(hash)
      if (element) {
        element.scrollIntoView({ behavior: "smooth" })
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation subnavItems={subnavItems} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-12 space-y-16 w-full">
        {/* Getting Started */}
        <section id="getting-started" className="scroll-mt-32 space-y-6 sm:space-y-8">
          <h2 className="text-2xl sm:text-3xl font-bold">Getting Started</h2>

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
                <a href="/downloads" className="inline-block mt-2">
                  <Button className="gap-2">
                    <Download className="w-4 h-4" />
                    Install Extension
                  </Button>
                </a>
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
                <a href="/downloads" className="inline-block mt-2">
                  <Button className="gap-2">
                    <Download className="w-4 h-4" />
                    Download Both
                  </Button>
                </a>
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
                    <CardTitle>Keep the Keyboard Shortcut Set to "In Chrome"</CardTitle>
                    <CardDescription>Especially if you use more than one Chrome profile</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                        Avoid the "Global" scope
                      </p>
                      <p className="text-sm text-yellow-600 dark:text-yellow-500">
                        Chrome gives a "Global" shortcut to only one profile. With it, Alt+Tab in any other profile
                        opens the first profile's tabs and switches you there. It can also clash with the native app's
                        Alt+Tab.
                      </p>
                      <p className="text-sm text-yellow-600 dark:text-yellow-500">
                        Older versions of the extension recommended "Global" because Chrome could miss the Alt release
                        after you pressed Tab several times. The latest version handles that with "In Chrome".
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium">To check it:</p>
                  <ol className="text-sm text-muted-foreground space-y-2 ml-4 list-decimal">
                    <li>
                      Open <code className="px-2 py-1 bg-muted rounded text-xs">chrome://extensions/shortcuts</code> in
                      Chrome (in each profile you use)
                    </li>
                    <li>Find "Tab Application Switcher" in the list</li>
                    <li>Make sure the dropdown next to the shortcut says "In Chrome"</li>
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
                  <p className="text-sm font-medium">Alt+Tab shows tabs from another Chrome profile</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>The shortcut is set to "Global" in one of your profiles</li>
                    <li>Set it back to "In Chrome" on chrome://extensions/shortcuts in every profile</li>
                    <li>The native app shows and switches between tabs from all your profiles at once</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Extension doesn't respond to Alt+Tab</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Make sure the extension is installed and enabled</li>
                    <li>Check that the keyboard shortcut is configured in chrome://extensions/shortcuts</li>
                    <li>Make sure the shortcut scope is "In Chrome" in the profile you're using</li>
                    <li>Restart Chrome after making changes</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Releasing Alt doesn't switch tabs</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Update the extension: older versions missed the release after several Tab presses</li>
                    <li>
                      If you let go of Alt before the switcher appears, it stays open; press Enter to switch, or Esc
                    </li>
                    <li>The native app handles keys at the OS level and doesn't have this limit</li>
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
                  opens a popup showing your tabs sorted by the time you last used them. Press Tab to cycle through
                  tabs, then release Alt to switch to the selected tab.
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Pricing</h2>
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-border rounded-xl p-6 sm:p-8">
            <p className="text-xl sm:text-2xl font-semibold mb-2">Free & Open Source</p>
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">History</h2>
          <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground">
            <p>
              Tab Application Switcher was created to solve a simple problem:{" "}
              <strong>
                I just want to switch between my browser tabs as fast as I can switch between OS applications
              </strong>
              . I don't want to click. I don't want to think. I just want to cycle back to the last tab I am interested
              in, and then have the actual tab in front of me with the release of a key.
            </p>
            <p>
              TAS started many years ago. It was before Chrome had Search Tabs... (&#8984;+Shift+A / Ctrl+Shift+A).
              Search Tabs ended up doing a lot of what TAS was doing, and for a while I thought it might be the end of
              the line for TAS. But at the end of the day it just didn't give me that Application Switcher feeling. So I
              built a brand new iteration of TAS. I hope you like it.
            </p>
            <p>
              You can still use TAS like the old days for the most part. If you just want a browser extension to switch
              through and manage tabs, you can use the extension only. On the other hand, if you crave the native
              Application Switcher vibe, you can install the native app. And howdy doody, you got yourself a Tab
              Application Switcher!
            </p>
          </div>
        </section>

        {/* Compare */}
        <section id="compare" className="scroll-mt-32 space-y-8 sm:space-y-12">
          <h2 className="text-2xl sm:text-3xl font-bold">Compare</h2>

          {/* TAS vs Chrome Tab Search */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Tab Switcher vs Chrome's Tab Search</h3>
            <p className="text-muted-foreground text-sm">
              Chrome's built-in tab search (&#8984;+Shift+A / Ctrl+Shift+A) lets you search and click to switch tabs.
              TAS provides the familiar Alt+Tab experience: hold the modifier, tap to cycle, release to confirm.
            </p>
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 pr-4 font-medium min-w-[200px]">Feature</th>
                    <th className="text-center py-3 px-4 font-medium whitespace-nowrap">TAS</th>
                    <th className="text-center py-3 px-4 font-medium whitespace-nowrap">Chrome Tab Search</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4">Alt+Tab-style switching (hold & release)</td>
                    <td className="text-center py-3 px-4">&#10003;</td>
                    <td className="text-center py-3 px-4">&#10007;</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4">Keyboard navigation through tab list</td>
                    <td className="text-center py-3 px-4">&#10003;</td>
                    <td className="text-center py-3 px-4">&#10007;</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4">Cross-window MRU order</td>
                    <td className="text-center py-3 px-4">&#10003;</td>
                    <td className="text-center py-3 px-4">Partial*</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4">"Last active" timestamp</td>
                    <td className="text-center py-3 px-4">&#10003;</td>
                    <td className="text-center py-3 px-4">&#10003;</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4">Search/filter tabs</td>
                    <td className="text-center py-3 px-4">&#10003;</td>
                    <td className="text-center py-3 px-4">&#10003;</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4">Customizable keyboard shortcuts</td>
                    <td className="text-center py-3 px-4">&#10003;</td>
                    <td className="text-center py-3 px-4">&#10007;</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4">Native app with OS-level shortcuts</td>
                    <td className="text-center py-3 px-4">&#10003;</td>
                    <td className="text-center py-3 px-4">&#10007;</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4">MRU persists across browser restarts</td>
                    <td className="text-center py-3 px-4">&#10003;</td>
                    <td className="text-center py-3 px-4">&#10007;</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              * Chrome's timestamps don't update when switching between windows, only when switching tabs within the
              same window. TAS tracks true cross-window usage.
            </p>
          </div>

          {/* TAS Tab Management vs Others */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Tab Management vs Popular Extensions</h3>
            <p className="text-muted-foreground text-sm">
              TAS combines fast tab switching with tab management and collections. Here's how it compares to popular tab
              management extensions.
            </p>
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 pr-4 font-medium min-w-[160px]">Feature</th>
                    <th className="text-center py-3 px-2 font-medium whitespace-nowrap">TAS</th>
                    <th className="text-center py-3 px-2 font-medium whitespace-nowrap">Toby</th>
                    <th className="text-center py-3 px-2 font-medium whitespace-nowrap">Workona</th>
                    <th className="text-center py-3 px-2 font-medium whitespace-nowrap">OneTab</th>
                    <th className="text-center py-3 px-2 font-medium whitespace-nowrap">Session Buddy</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4">MRU tab switching</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4">Save tab collections</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4">Cloud sync</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4">Keeps tabs open</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4">Drag-and-drop organization</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4">No account required</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4">Free & open source</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4">Multi-browser support*</td>
                    <td className="text-center py-3 px-2">&#10003;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                    <td className="text-center py-3 px-2">&#10007;</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">* With native app installed</p>
          </div>

          {/* Why TAS */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Why Choose TAS?</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">Muscle Memory</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Works like your OS app switcher. Same Alt+Tab pattern you already know—hold the modifier, tap to
                    navigate, release to confirm.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Unlock className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">Free Forever</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    100% free and open source. No premium tiers, no subscriptions, no data collection. The code is on
                    GitHub for anyone to audit.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Grid2x2 className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">Cross-Window</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    TAS tracks when you actually look at each tab, including window switches. Chrome's built-in
                    timestamps don't update when switching between windows.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">Persistent</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Your MRU order and collections survive browser restarts. Chrome's tab order resets every time you
                    close your browser.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Terms of Service */}
        <section id="terms" className="scroll-mt-32">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Terms of Service</h2>
          <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground">
            <p>
              Tab Application Switcher is provided "as is" without warranty of any kind. By using this software, you
              agree to use it at your own risk.
            </p>
            <p>
              Signing in is optional. What happens to your data when you do is in the{" "}
              <a href="#privacy" className="text-foreground underline hover:no-underline">
                privacy policy
              </a>{" "}
              below.
            </p>
          </div>
        </section>
        {/* Privacy */}
        <section id="privacy" className="scroll-mt-32">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Privacy Policy</h2>
          <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground">
            <p>
              <strong className="text-foreground">Without an account,</strong> nothing leaves your computer. The
              extension and the Mac app keep your tabs, their order, your settings and your collections on your device,
              and the extension talks to the Mac app only on your computer.
            </p>
            <p>
              <strong className="text-foreground">If you sign in</strong> (optional, with Google or Apple), we keep your
              name, email address and profile picture from that account, and the collections you save: their names and
              the titles, addresses and icons of their tabs. That's what lets your collections sync between your
              browsers and the Mac app. Each signed-in session also records the IP address and browser it came from, to
              keep your account secure. With Sign in with Apple you can choose to share a private relay address instead
              of your email.
            </p>
            <p>
              We use this only to sign you in and sync your collections. There are no ads, no analytics and no tracking,
              and we don't sell or share your data.
            </p>
            <p>
              <strong className="text-foreground">Other services:</strong> the site and account data are hosted on
              Cloudflare, and sign-in goes through Google or Apple. When you add a link to a collection by hand, its
              icon comes from Google's favicon service, which sees the link's domain. The Mac app checks GitHub for
              updates.
            </p>
            <p>
              <strong className="text-foreground">Deleting your data:</strong> Delete Account on the{" "}
              <a href="/account" className="text-foreground underline hover:no-underline">
                Account page
              </a>{" "}
              deletes your account, its synced collections and every session right away. Collections kept in the
              extension or the Mac app stay on that device until you remove them there.
            </p>
            <p>
              Questions about your data:{" "}
              <a
                href="https://github.com/mckinley/tab-app-switcher/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline hover:no-underline"
              >
                open an issue
              </a>
              . Last updated October 27, 2026.
            </p>
          </div>
        </section>

        {/* Support */}
        <section id="support" className="scroll-mt-32">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Support</h2>
          <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground">
            <p>Need help? Here are your options:</p>
            <ul className="space-y-2">
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
