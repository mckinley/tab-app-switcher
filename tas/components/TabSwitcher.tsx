import { useState, useEffect, useRef, useMemo } from "react"
import { Search, LayoutGrid, Settings as SettingsIcon, RefreshCw } from "lucide-react"
import { TabItem } from "./TabItem"
import { Tab, KeyboardShortcuts, TabSection } from "../types/tabs"
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts"

const SECTION_LABELS: Record<TabSection, string> = {
  tabs: "Tabs",
  apps: "Apps",
  recentlyClosed: "Recently Closed",
  otherDevices: "Other Devices",
}

// Subtle, earthy background colors for each section
const SECTION_BACKGROUNDS: Record<TabSection, string> = {
  tabs: "", // No background for main tabs section
  apps: "bg-amber-500/5", // Warm amber/orange
  recentlyClosed: "bg-rose-500/5", // Soft pink/rose
  otherDevices: "bg-teal-500/5", // Pleasant teal
}

const SECTION_ORDER: TabSection[] = ["tabs", "apps", "recentlyClosed", "otherDevices"]

interface TabSwitcherProps {
  tabs: Tab[]
  selectedIndex: number
  onSelectTab: (tabId: string) => void
  onClose: () => void
  onNavigate: (direction: "next" | "prev") => void
  onCloseTab: (tabId: string) => void
  shortcuts: KeyboardShortcuts
  onOpenSettings: () => void // Called when user clicks settings button
  onOpenTabManagement: () => void // Called when user clicks tab management button
  isEnabled?: boolean // Optional: Whether keyboard shortcuts are enabled - defaults to true
  onRefresh?: () => void // Called when user clicks refresh button
  isRefreshing?: boolean // Whether a refresh is in progress
}

export const TabSwitcher = ({
  tabs,
  selectedIndex,
  onSelectTab,
  onClose,
  onNavigate,
  onCloseTab,
  shortcuts,
  onOpenSettings,
  onOpenTabManagement,
  isEnabled = true,
  onRefresh,
  isRefreshing = false,
}: TabSwitcherProps) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedItemRef = useRef<HTMLDivElement>(null)

  const filteredTabs = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return tabs.filter((tab) => tab.title.toLowerCase().includes(query) || tab.url.toLowerCase().includes(query))
  }, [tabs, searchQuery])

  // Group filtered tabs by section, maintaining order
  const groupedTabs = useMemo(() => {
    const groups: { section: TabSection; label: string; tabs: { tab: Tab; globalIndex: number }[] }[] = []
    let globalIndex = 0

    for (const section of SECTION_ORDER) {
      const sectionTabs = filteredTabs.filter((tab) => (tab.section ?? "tabs") === section)
      if (sectionTabs.length > 0) {
        groups.push({
          section,
          label: SECTION_LABELS[section],
          tabs: sectionTabs.map((tab) => ({ tab, globalIndex: globalIndex++ })),
        })
      }
    }

    return groups
  }, [filteredTabs])

  // Check if tabs are from multiple browsers
  const hasMultipleBrowsers = useMemo(() => {
    const browsers = new Set(tabs.map((tab) => tab.browser).filter(Boolean))
    return browsers.size > 1
  }, [tabs])

  // Check if we have multiple sections (to show section headers)
  const hasMultipleSections = groupedTabs.length > 1

  // Track if this is the initial mount to prevent auto-scroll on open
  const isInitialMount = useRef(true)
  const previousSelectedIndex = useRef(selectedIndex)

  // Reset search and scroll position when component mounts
  useEffect(() => {
    setSearchQuery("")
    setIsSearchFocused(false)
    // Reset scroll to top when component mounts
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
    isInitialMount.current = true
  }, [])

  // Auto-scroll selected item into view (but not on initial mount or reset)
  useEffect(() => {
    // Skip scroll if this is initial mount or if selection was just reset to index 1
    if (isInitialMount.current) {
      isInitialMount.current = false
      previousSelectedIndex.current = selectedIndex
      return
    }

    // Only scroll if user is navigating (not when selection is reset)
    if (selectedItemRef.current && previousSelectedIndex.current !== selectedIndex) {
      selectedItemRef.current.scrollIntoView({
        behavior: "instant",
        block: "nearest",
      })
    }

    previousSelectedIndex.current = selectedIndex
  }, [selectedIndex])

  // Use the keyboard shortcuts hook to handle all keyboard events
  useKeyboardShortcuts({
    enabled: isEnabled,
    shortcuts,
    isSearchFocused,
    // Panel state is managed by parent, but we still need to pass these for the hook
    isSettingsOpen: false,
    isTabManagementOpen: false,
    onNavigateNext: () => onNavigate("next"),
    onNavigatePrev: () => onNavigate("prev"),
    onActivateSelected: () => {
      if (filteredTabs[selectedIndex]) {
        onSelectTab(filteredTabs[selectedIndex].id)
      }
    },
    onClose,
    onFocusSearch: () => {
      setIsSearchFocused(true)
      searchInputRef.current?.focus()
    },
    onBlurSearch: () => {
      setIsSearchFocused(false)
      searchInputRef.current?.blur()
    },
    onCloseTab: () => {
      if (filteredTabs[selectedIndex]) {
        onCloseTab(filteredTabs[selectedIndex].id)
      }
    },
  })

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col overflow-hidden" style={{ isolation: "isolate" }}>
      {/* Search Bar */}
      <div className="p-3 border-b border-border/50">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder={`Press '${shortcuts.search}' to search tabs...`}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-input text-foreground placeholder:text-muted-foreground border border-transparent focus:border-ring/30 outline-none transition-colors"
            />
          </div>

          {/* Action Icons */}
          <div className="flex flex-col gap-1">
            <button
              onClick={onOpenTabManagement}
              className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Advanced tab management"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>

            <button
              onClick={onOpenSettings}
              className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-2 py-2">
          {filteredTabs.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="text-muted-foreground text-sm">No tabs open</div>
              <p className="text-xs text-muted-foreground/70">Add a tab to get started</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {groupedTabs.map((group) => (
                <div
                  key={group.section}
                  className={`${SECTION_BACKGROUNDS[group.section]} ${group.section !== "tabs" ? "rounded-lg mx-0.5 px-0.5" : ""}`}
                >
                  {/* Section header - only show if we have multiple sections and not the main tabs section */}
                  {hasMultipleSections && group.section !== "tabs" && (
                    <div className="px-2 pt-2 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </div>
                  )}
                  <div className={group.section !== "tabs" ? "pb-1" : ""}>
                    {group.tabs.map(({ tab, globalIndex }) => (
                      <div
                        key={tab.id}
                        ref={globalIndex === selectedIndex ? selectedItemRef : null}
                        className="scroll-my-1"
                      >
                        <TabItem
                          tab={tab}
                          isSelected={globalIndex === selectedIndex}
                          onClick={() => onSelectTab(tab.id)}
                          onClose={(e) => {
                            e.stopPropagation()
                            onCloseTab(tab.id)
                          }}
                          showBrowserIcon={hasMultipleBrowsers}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer with shortcuts */}
      <div className="px-3 py-2 border-t border-border/50">
        <div className="flex items-center">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">{shortcuts.search}</kbd>
              <span>Search</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">{shortcuts.closeTab}</kbd>
              <span>Close</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">↵</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">Esc</kbd>
              <span>Exit</span>
            </div>
          </div>
          <div className="flex-1" /> {/* Spacer to push refresh button to right */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
              aria-label="Refresh tabs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
