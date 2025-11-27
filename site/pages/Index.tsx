import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { TabSwitcher } from "@tas/components/TabSwitcher"
import { Settings } from "@tas/components/Settings"
import { TabManagement } from "@tas/components/TabManagement"
import { Tab, KeyboardShortcuts, DEFAULT_SHORTCUTS } from "@tas/types/tabs"
import { ChromeTabsPreview } from "@/components/ChromeTabsPreview"
import { ThemeToggle } from "@/components/ThemeToggle"
import { TabsTooltip } from "@/components/TabsTooltip"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/Container"

import { Command, Download, Zap, Search, Keyboard, Clock, ArrowUpDown, X } from "lucide-react"
import { detectPlatform, getBrowserDisplayName, getOSDisplayName } from "@/lib/detectPlatform"
import logo from "@/assets/logo.jpg"

// GitHub release URLs
const GITHUB_REPO = "mckinley/tab-app-switcher"
const LATEST_VERSION = "0.1.0"
const MACOS_DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/download/v${LATEST_VERSION}/Tab-Application-Switcher-${LATEST_VERSION}-arm64-mac.zip`

// Chrome Web Store URL
const CHROME_EXTENSION_ID = "mfcjanplaceclfoipcengelejgfngcan"
const CHROME_STORE_URL = `https://chromewebstore.google.com/detail/${CHROME_EXTENSION_ID}`

// Demo tab pool - these represent potential tabs that can be opened
const DEMO_TAB_POOL: Tab[] = [
  {
    id: "1",
    title: "NRDC",
    url: "https://www.nrdc.org/",
    favicon: "/favicons/nrdc.ico",
  },
  {
    id: "2",
    title: "Sierra Club",
    url: "https://www.sierraclub.org/",
    favicon: "/favicons/sierraclub.png",
  },
  {
    id: "3",
    title: "Greenpeace",
    url: "https://www.greenpeace.org/",
    favicon: "/favicons/greenpeace.ico",
  },
  {
    id: "4",
    title: "WWF (World Wildlife Fund)",
    url: "https://www.worldwildlife.org/",
    favicon: "/favicons/wwf.ico",
  },
  {
    id: "5",
    title: "Amnesty International",
    url: "https://www.amnesty.org/",
    favicon: "/favicons/amnesty.png",
  },
  {
    id: "6",
    title: "Human Rights Watch",
    url: "https://www.hrw.org/",
    favicon: "/favicons/hrw.ico",
  },
  {
    id: "7",
    title: "International Rescue Committee",
    url: "https://www.rescue.org/",
    favicon: "/favicons/irc.ico",
  },
  {
    id: "8",
    title: "Doctors Without Borders",
    url: "https://www.doctorswithoutborders.org/",
    favicon: "/favicons/msf.ico",
  },
]

/**
 * Custom hook to manage demo tabs with browser-like MRU behavior
 * This simulates the extension's tab management API for the demo site
 */
const useDemoTabs = () => {
  // Initialize with a random subset of tabs
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const shuffled = [...DEMO_TAB_POOL]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  })

  // Track the active tab (simulates browser's active tab)
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id || "")

  // MRU order - tracks tab IDs in most-recently-used order
  const [mruOrder, setMruOrder] = useState<string[]>(tabs.map((t) => t.id))

  // Get tabs in MRU order (similar to GET_TABS message in extension)
  const getTabsInMruOrder = (): Tab[] => {
    return mruOrder.map((id) => tabs.find((t) => t.id === id)).filter((tab): tab is Tab => tab !== undefined)
  }

  // Activate a tab (similar to ACTIVATE_TAB message in extension)
  const activateTab = (tabId: string) => {
    setActiveTabId(tabId)
    // Move to front of MRU order
    setMruOrder((prev) => [tabId, ...prev.filter((id) => id !== tabId)])
  }

  // Close a tab (similar to CLOSE_TAB message in extension)
  const closeTab = (tabId: string) => {
    // Calculate what the new active tab should be if we're closing the active one
    if (activeTabId === tabId) {
      const remainingInMru = mruOrder.filter((id) => id !== tabId)
      if (remainingInMru.length > 0) {
        setActiveTabId(remainingInMru[0])
      } else {
        setActiveTabId("") // No tabs left
      }
    }

    // Remove tab from tabs array
    setTabs((prev) => prev.filter((t) => t.id !== tabId))
    // Remove from MRU order
    setMruOrder((prev) => prev.filter((id) => id !== tabId))
  }

  // Add a new tab (simulates opening a new tab)
  const addTab = () => {
    if (tabs.length >= 8) return

    // Pick a random tab from DEMO_TAB_POOL that's not currently in tabs
    const availableTabs = DEMO_TAB_POOL.filter((t) => !tabs.find((tab) => tab.id === t.id))
    if (availableTabs.length === 0) {
      // If all tabs are used, pick any random tab and give it a new ID
      const randomTab = DEMO_TAB_POOL[Math.floor(Math.random() * DEMO_TAB_POOL.length)]
      const newTab = {
        ...randomTab,
        id: `${randomTab.id}-${Date.now()}`,
      }
      setTabs((prev) => [...prev, newTab])
      setMruOrder((prev) => [...prev, newTab.id])
    } else {
      const randomTab = availableTabs[Math.floor(Math.random() * availableTabs.length)]
      setTabs((prev) => [...prev, randomTab])
      setMruOrder((prev) => [...prev, randomTab.id])
    }
  }

  return {
    tabs,
    activeTabId,
    mruOrder,
    getTabsInMruOrder,
    activateTab,
    closeTab,
    addTab,
  }
}

const Index = () => {
  const [platform] = useState(() => detectPlatform())

  // Use the demo tab management hook
  const { tabs, activeTabId, getTabsInMruOrder, activateTab, closeTab, addTab } = useDemoTabs()

  // Load shortcuts from localStorage or use defaults
  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>(() => {
    const saved = localStorage.getItem("tas-shortcuts")
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error("Failed to parse shortcuts from localStorage", e)
      }
    }
    return DEFAULT_SHORTCUTS
  })

  // Save shortcuts to localStorage when they change
  useEffect(() => {
    localStorage.setItem("tas-shortcuts", JSON.stringify(shortcuts))
  }, [shortcuts])

  const [isSwitcherActive, setIsSwitcherActive] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(1)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isTabManagementOpen, setIsTabManagementOpen] = useState(false)

  // Track if any panel is open for keyboard event blocking
  const isPanelOpen = isSettingsOpen || isTabManagementOpen

  // Get tabs in MRU order for the switcher
  const mruTabs = getTabsInMruOrder()

  const handleSelectTab = (tabId: string) => {
    console.log("Selected tab:", tabId)
    activateTab(tabId)
    setIsSwitcherActive(false)
  }

  const handleTabClick = (tabId: string) => {
    activateTab(tabId)
  }

  const handleCloseTab = (tabId: string) => {
    closeTab(tabId)
  }

  const handleAddTab = () => {
    addTab()
  }

  const handleNavigate = useCallback(
    (direction: "next" | "prev") => {
      setSelectedIndex((prev) => {
        if (direction === "next") {
          return (prev + 1) % mruTabs.length
        } else {
          return prev === 0 ? mruTabs.length - 1 : prev - 1
        }
      })
    },
    [mruTabs.length],
  )

  // Mac-like Application Switcher behavior with configurable modifier key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard events when a panel is open
      if (isPanelOpen) return

      // Check if modifier key is pressed
      const isModifierPressed =
        (shortcuts.modifier === "Alt" && e.altKey) ||
        (shortcuts.modifier === "Cmd" && e.metaKey) ||
        (shortcuts.modifier === "Ctrl" && e.ctrlKey) ||
        (shortcuts.modifier === "Shift" && e.shiftKey)

      // Modifier+ActivateForward to open switcher or cycle forward
      if (isModifierPressed && e.key === shortcuts.activateForward) {
        e.preventDefault()
        if (!isSwitcherActive) {
          setIsSwitcherActive(true)
          setSelectedIndex(1) // Start with second tab selected
        } else {
          handleNavigate("next")
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isSwitcherActive, selectedIndex, isPanelOpen, shortcuts, handleNavigate])

  return (
    <div className="min-h-screen bg-background">
      <ChromeTabsPreview
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={handleTabClick}
        onCloseTab={handleCloseTab}
        onAddTab={handleAddTab}
        canAddTab={tabs.length < 8}
      />

      {/* Header - positioned below tabs with help button on left, downloads and theme toggle on right */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center gap-2 pt-4 pb-8">
          {/* Left side - Help button */}
          <TabsTooltip hideTooltip={isSwitcherActive} />

          {/* Right side - Downloads, Getting Started, and Theme Toggle */}
          <div className="flex items-center gap-2">
            <Link to="/getting-started">
              <Button variant="ghost">Getting Started</Button>
            </Link>
            <Link to="/downloads">
              <Button variant="ghost">Downloads</Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
        <div className="max-w-4xl space-y-8">
          <div className="space-y-4">
            <img
              src={logo}
              alt="Tab Application Switcher Logo"
              className="h-20 w-auto mx-auto rounded-lg mb-12 animate-fade-in"
              style={{ animationDuration: "800ms" }}
            />
            <h1 className="text-6xl font-bold text-foreground">Tab Application Switcher</h1>
            <p className="text-2xl text-muted-foreground max-w-3xl mx-auto">
              Like your system's Application Switcher, but for your browser tabs
            </p>
          </div>

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

          <div className="pt-8">
            <Button onClick={() => setIsSwitcherActive(true)} variant="secondary" size="lg" className="gap-2">
              <Command className="w-4 h-4" />
              Try Live Demo ({shortcuts.modifier}+{shortcuts.activateForward})
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              Press <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">{shortcuts.modifier}</kbd> +{" "}
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">{shortcuts.activateForward}</kbd> to
              activate
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Features</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Keyboard className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Keyboard Shortcuts</h3>
            <p className="text-muted-foreground">
              Intelligent and configurable keyboard shortcuts, very similar to your operating system's application
              switcher.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">MRU Ordering</h3>
            <p className="text-muted-foreground">
              Tabs are ordered by their last use. The last tab you used is always the first tab to select.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Quick Search</h3>
            <p className="text-muted-foreground">
              Search tabs by URL and page title for instant access to any open tab.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Lightning Fast</h3>
            <p className="text-muted-foreground">
              Instant response with smooth, native-feeling animations. No lag, no delays.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <ArrowUpDown className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Arrow Navigation</h3>
            <p className="text-muted-foreground">
              Use arrow keys to move through tabs. Press Enter to select, Esc to close.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <X className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Close Tabs Fast</h3>
            <p className="text-muted-foreground">
              Quickly close tabs with Alt+W while in the switcher, or click the X button on any tab.
            </p>
          </div>
        </div>
      </div>

      {/* How to Use Section */}
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="bg-card border border-border rounded-xl p-8 space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Default Keyboard Shortcuts</h2>

          <div className="space-y-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <kbd className="px-3 py-2 bg-muted rounded font-mono text-sm shrink-0 w-fit">
                {shortcuts.modifier} + {shortcuts.activateForward}
              </kbd>
              <span className="text-muted-foreground">Activate TAS and move forward through tabs</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <kbd className="px-3 py-2 bg-muted rounded font-mono text-sm shrink-0 w-fit">
                {shortcuts.modifier} + {shortcuts.activateBackward}
              </kbd>
              <span className="text-muted-foreground">Move backward through the list of tabs</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <kbd className="px-3 py-2 bg-muted rounded font-mono text-sm shrink-0 w-fit">↑ ↓</kbd>
              <span className="text-muted-foreground">Navigate through the list of tabs</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <kbd className="px-3 py-2 bg-muted rounded font-mono text-sm shrink-0 w-fit">Enter</kbd>
              <span className="text-muted-foreground">Select the highlighted tab</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <kbd className="px-3 py-2 bg-muted rounded font-mono text-sm shrink-0 w-fit">Esc</kbd>
              <span className="text-muted-foreground">Close TAS without making a selection</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <kbd className="px-3 py-2 bg-muted rounded font-mono text-sm shrink-0 w-fit">
                Release {shortcuts.modifier}
              </kbd>
              <span className="text-muted-foreground">Select the highlighted tab</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <kbd className="px-3 py-2 bg-muted rounded font-mono text-sm shrink-0 w-fit">
                {shortcuts.modifier} + {shortcuts.closeTab}
              </kbd>
              <span className="text-muted-foreground">Close the highlighted tab</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground pt-4 border-t border-border">
            Shortcuts are configurable through the Options panel.
          </p>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="max-w-4xl mx-auto px-8 py-16 text-center">
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-border rounded-xl p-12 space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Ready to switch tabs like a pro?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Install the browser extension and native UI to get started
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

          <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/getting-started"
              className="text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Getting Started Guide
            </Link>
            <span className="hidden sm:inline text-muted-foreground">•</span>
            <Link to="/downloads" className="text-muted-foreground hover:text-foreground transition-colors underline">
              View all download options
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="text-right">
          <a
            href="https://www.mckinleydigital.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            McKinley Digital
          </a>
        </div>
      </div>

      {/* TabSwitcher in panel-right container */}
      <Container
        variant="panel-right"
        isVisible={isSwitcherActive}
        onClose={() => setIsSwitcherActive(false)}
        enabled={!isPanelOpen}
      >
        <TabSwitcher
          tabs={mruTabs}
          selectedIndex={selectedIndex}
          onSelectTab={handleSelectTab}
          onClose={() => setIsSwitcherActive(false)}
          onNavigate={handleNavigate}
          onCloseTab={handleCloseTab}
          shortcuts={shortcuts}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenTabManagement={() => setIsTabManagementOpen(true)}
          isEnabled={!isPanelOpen}
        />
      </Container>

      {/* Settings in modal container */}
      <Container variant="modal" isVisible={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}>
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">TAS Settings</h2>
            <p className="text-sm text-muted-foreground">Customize keyboard shortcuts and appearance</p>
          </div>
          <Settings shortcuts={shortcuts} onShortcutsChange={setShortcuts} themeToggle={<ThemeToggle />} />
        </div>
      </Container>

      {/* TabManagement in full-screen container */}
      <Container variant="full-screen" isVisible={isTabManagementOpen} onClose={() => setIsTabManagementOpen(false)}>
        <TabManagement
          tabs={mruTabs}
          onClose={() => setIsTabManagementOpen(false)}
          onSelectTab={handleSelectTab}
          shortcuts={shortcuts}
          onShortcutsChange={setShortcuts}
          settingsThemeToggle={<ThemeToggle />}
        />
      </Container>
    </div>
  )
}

export default Index
