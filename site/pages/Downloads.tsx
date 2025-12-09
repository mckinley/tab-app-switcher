import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Button } from "@tab-app-switcher/ui/components/button"
import { Download, Monitor, Info } from "lucide-react"
import { SiApple } from "@icons-pack/react-simple-icons"
import { BrowserIcon } from "@tas/components/BrowserIcon"
import { BrowserType } from "@tas/types/tabs"
import { detectPlatform, getBrowserDisplayName, getOSDisplayName } from "@/lib/detectPlatform"
import { Navigation } from "@/components/Navigation"
import { Footer } from "@/components/Footer"
import nativePackage from "../../native/package.json"

// GitHub release URL - direct download of the latest macOS zip
const GITHUB_REPO = "mckinley/tab-app-switcher"
const NATIVE_VERSION = nativePackage.version
const MACOS_DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/download/v${NATIVE_VERSION}/Tab-Application-Switcher-${NATIVE_VERSION}-arm64-mac.zip`

// Extension Store URLs
const CHROME_EXTENSION_ID = "mfcjanplaceclfoipcengelejgfngcan"
const CHROME_STORE_URL = `https://chromewebstore.google.com/detail/${CHROME_EXTENSION_ID}`
const FIREFOX_STORE_URL = "https://addons.mozilla.org/firefox/addon/tab-application-switcher/"
const EDGE_EXTENSION_ID = "epfinbjjhhlpbfcdmdhnddbjebmbkjck"
const EDGE_STORE_URL = `https://microsoftedge.microsoft.com/addons/detail/${EDGE_EXTENSION_ID}`

const Downloads = () => {
  const [platform, setPlatform] = useState(() => detectPlatform())

  useEffect(() => {
    setPlatform(detectPlatform())
  }, [])

  const browserExtensions: { name: string; browser: BrowserType; url: string; available: boolean }[] = [
    {
      name: "Chrome",
      browser: "chrome",
      url: CHROME_STORE_URL,
      available: true,
    },
    {
      name: "Firefox",
      browser: "firefox",
      url: FIREFOX_STORE_URL,
      available: true,
    },
    {
      name: "Edge",
      browser: "edge",
      url: EDGE_STORE_URL,
      available: true,
    },
    {
      name: "Safari",
      browser: "safari",
      url: "#safari-store",
      available: false,
    },
  ]

  const nativeApps = [
    {
      name: "macOS",
      icon: SiApple,
      url: MACOS_DOWNLOAD_URL,
      available: true,
      beta: true,
      instructions: [
        "Download and extract the ZIP file",
        "Move the app to your Applications folder",
        "Double-click to open the app",
        "Install the Chrome extension to connect",
      ],
    },
    {
      name: "Windows",
      icon: Monitor,
      url: "#windows-download",
      available: false,
      beta: false,
      instructions: [],
    },
    {
      name: "Linux",
      icon: Monitor,
      url: "#linux-download",
      available: false,
      beta: false,
      instructions: [],
    },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-8 py-12 w-full">
        {/* Detected Platform Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-foreground mb-4">Download TAS</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Detected: {getBrowserDisplayName(platform.browser)} on {getOSDisplayName(platform.os)}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {(() => {
              const storeUrl =
                platform.browser === "chrome"
                  ? CHROME_STORE_URL
                  : platform.browser === "firefox"
                    ? FIREFOX_STORE_URL
                    : platform.browser === "edge"
                      ? EDGE_STORE_URL
                      : null
              const isAvailable = storeUrl !== null

              return (
                <Button size="lg" className="gap-2 text-lg px-8 py-6" asChild={isAvailable} disabled={!isAvailable}>
                  {isAvailable ? (
                    <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="w-5 h-5" />
                      Install {getBrowserDisplayName(platform.browser)} Extension
                    </a>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Install {getBrowserDisplayName(platform.browser)} Extension (Coming Soon)
                    </>
                  )}
                </Button>
              )
            })()}
            <Button
              size="lg"
              variant="outline"
              className="gap-2 text-lg px-8 py-6"
              asChild={platform.os === "mac"}
              disabled={platform.os !== "mac"}
            >
              {platform.os === "mac" ? (
                <a href={MACOS_DOWNLOAD_URL}>
                  <Download className="w-5 h-5" />
                  Download for {getOSDisplayName(platform.os)}
                </a>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download for {getOSDisplayName(platform.os)} (Coming Soon)
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Browser Extensions Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Browser Extensions</h2>
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {browserExtensions.map((browser) => (
                <div key={browser.name} className="relative bg-card border border-border rounded-xl overflow-hidden">
                  <a
                    href={browser.available ? browser.url : undefined}
                    className={`group p-8 transition-colors block ${
                      browser.available ? "hover:bg-accent/5" : "pointer-events-none"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <BrowserIcon browser={browser.browser} className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-foreground mb-2">{browser.name}</h3>
                        <p className="text-muted-foreground mb-4">Install TAS extension for {browser.name}</p>
                        <Button variant="outline" className="gap-2" disabled={!browser.available}>
                          <Download className="w-4 h-4" />
                          Install Extension
                        </Button>
                      </div>
                    </div>
                  </a>

                  {/* Coming Soon Overlay */}
                  {!browser.available && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                      <div className="text-center">
                        <Info className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-lg font-semibold text-foreground">Coming Soon</p>
                        <p className="text-sm text-muted-foreground">Not yet available</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Native Apps Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4 text-center">Native UI Apps</h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            The Native UI provides OS-level keyboard shortcuts and an overlay that appears above all applications, just
            like your system's application switcher.
          </p>
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="grid md:grid-cols-3 gap-6">
              {nativeApps.map((app) => (
                <div
                  key={app.name}
                  className="bg-card border border-border rounded-xl p-8 text-center relative overflow-hidden"
                >
                  {/* Beta Badge */}
                  {app.beta && (
                    <div className="absolute top-4 right-4 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-3 py-1 rounded-full text-xs font-semibold border border-yellow-500/20">
                      BETA
                    </div>
                  )}

                  {/* Coming Soon Overlay */}
                  {!app.available && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-xl">
                      <div className="text-center space-y-2">
                        <Info className="w-12 h-12 text-muted-foreground mx-auto" />
                        <p className="text-lg font-semibold text-foreground">Coming Soon</p>
                        <p className="text-sm text-muted-foreground">Not yet available</p>
                      </div>
                    </div>
                  )}

                  <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <app.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{app.name}</h3>

                  {app.available ? (
                    <>
                      <p className="text-sm text-muted-foreground mb-4">Version {NATIVE_VERSION}</p>
                      <Button variant="outline" className="gap-2 mb-6" asChild>
                        <a href={app.url} download>
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                      </Button>

                      {/* Installation Instructions */}
                      {app.instructions.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-border text-left">
                          <h4 className="text-sm font-semibold text-foreground mb-3">Installation:</h4>
                          <ol className="text-xs text-muted-foreground space-y-2">
                            {app.instructions.map((instruction, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="font-semibold text-foreground">{idx + 1}.</span>
                                <span>{instruction}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">Download for {app.name}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-card border border-border rounded-xl p-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Why Two Downloads?</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              <strong className="text-foreground">Browser Extension:</strong> Works entirely within your browser. Use
              keyboard shortcuts to switch between tabs in any browser window. Perfect for getting started quickly.
            </p>
            <p>
              <strong className="text-foreground">Native UI App:</strong> Enhances your experience with OS-level
              keyboard registration and a system-wide overlay. The switcher appears above all applications, just like
              Alt+Tab on Windows or Cmd+Tab on macOS.
            </p>
            <p className="pt-4 border-t border-border text-sm">
              You can use the browser extension alone, or combine it with the Native UI for the best experience.
            </p>
            <div className="pt-4 border-t border-border">
              <Link to="/getting-started" className="text-primary hover:underline font-medium">
                View Getting Started Guide →
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Downloads
