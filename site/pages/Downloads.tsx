import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Download, Chrome, Apple, Monitor, Info } from "lucide-react"
import { detectPlatform, getBrowserDisplayName, getOSDisplayName } from "@/lib/detectPlatform"
import { NavLink } from "@/components/NavLink"
import { ThemeToggle } from "@/components/ThemeToggle"
import logo from "@/assets/logo.png"

// GitHub release URLs
const GITHUB_REPO = "mckinley/tab-app-switcher"
const LATEST_VERSION = "0.1.1"
const MACOS_DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/download/v${LATEST_VERSION}/Tab-Application-Switcher-${LATEST_VERSION}-arm64-mac.zip`

// Chrome Web Store URL
const CHROME_EXTENSION_ID = "mfcjanplaceclfoipcengelejgfngcan"
const CHROME_STORE_URL = `https://chromewebstore.google.com/detail/${CHROME_EXTENSION_ID}`

const Downloads = () => {
  const [platform, setPlatform] = useState(() => detectPlatform())

  useEffect(() => {
    setPlatform(detectPlatform())
  }, [])

  const browserExtensions = [
    {
      name: "Chrome",
      icon: Chrome,
      url: CHROME_STORE_URL,
      available: true,
      beta: false,
    },
    {
      name: "Firefox",
      icon: Chrome,
      url: "#firefox-store",
      available: false,
      beta: false,
    },
    {
      name: "Safari",
      icon: Apple,
      url: "#safari-store",
      available: false,
      beta: false,
    },
    {
      name: "Edge",
      icon: Chrome,
      url: "#edge-store",
      available: false,
      beta: false,
    },
  ]

  const nativeApps = [
    {
      name: "macOS",
      icon: Apple,
      url: MACOS_DOWNLOAD_URL,
      available: true,
      beta: true,
      instructions: [
        "Download and extract the ZIP file",
        "Open Terminal and run: xattr -cr ~/Downloads/Tab\\ Application\\ Switcher.app",
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
          <div className="flex items-center justify-between gap-2">
            <NavLink to="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img
                src={logo}
                alt="Tab Application Switcher Logo"
                className="h-8 w-auto rounded opacity-80 hover:opacity-100 transition-opacity flex-shrink-0"
              />
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Tab Application Switcher</h1>
            </NavLink>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Link to="/">
                <Button variant="ghost" size="sm" className="sm:h-10 sm:px-4">
                  <span className="hidden sm:inline">Back to Home</span>
                  <span className="sm:hidden">Home</span>
                </Button>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-16">
        {/* Detected Platform Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-foreground mb-4">Download TAS</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Detected: {getBrowserDisplayName(platform.browser)} on {getOSDisplayName(platform.os)}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="gap-2 text-lg px-8 py-6"
              asChild={platform.browser === "chrome"}
              disabled={platform.browser !== "chrome"}
            >
              {platform.browser === "chrome" ? (
                <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer">
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
            <Button
              size="lg"
              variant="outline"
              className="gap-2 text-lg px-8 py-6"
              asChild={platform.os === "mac"}
              disabled={platform.os !== "mac"}
            >
              {platform.os === "mac" ? (
                <a href={MACOS_DOWNLOAD_URL} download>
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
                        <browser.icon className="w-6 h-6 text-primary" />
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
                      <p className="text-sm text-muted-foreground mb-4">Version {LATEST_VERSION}</p>
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
      </div>
    </div>
  )
}

export default Downloads
