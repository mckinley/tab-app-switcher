import { useState, useEffect, useRef, type ReactNode } from "react";
import { Search, LayoutGrid } from "lucide-react";
import { TabItem } from "./TabItem";
import { TasSettings } from "./TasSettings";
import { TabManagement } from "./TabManagement";
import { cn } from "../lib/utils";
import { Tab, KeyboardShortcuts } from "../types/tabs";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";

interface TabSwitcherProps {
  tabs: Tab[];
  isVisible: boolean;
  selectedIndex: number;
  onSelectTab: (tabId: string) => void;
  onClose: () => void;
  onNavigate: (direction: 'next' | 'prev') => void;
  onSearchFocusChange?: (isFocused: boolean) => void;
  onCloseTab: (tabId: string) => void;
  onSettingsOpenChange?: (isOpen: boolean) => void;
  shortcuts: KeyboardShortcuts;
  onShortcutsChange: (shortcuts: KeyboardShortcuts) => void;
  settingsThemeToggle?: ReactNode;
  variant?: 'overlay' | 'popup'; // 'overlay' for website (fixed positioned), 'popup' for extension (fills container)
  onOpenSettingsPage?: () => void; // Optional callback to open settings in a new tab (extension only)
  onOpenTabManagementPage?: () => void; // Optional callback to open tab management in a new tab (extension only)
}

export const TabSwitcher = ({
  tabs,
  isVisible,
  selectedIndex,
  onSelectTab,
  onClose,
  onNavigate,
  onSearchFocusChange,
  onCloseTab,
  onSettingsOpenChange,
  shortcuts,
  onShortcutsChange,
  settingsThemeToggle,
  variant = 'overlay',
  onOpenSettingsPage,
  onOpenTabManagementPage,
}: TabSwitcherProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTabManagementOpen, setIsTabManagementOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  const handleSettingsOpenChange = (open: boolean) => {
    setIsSettingsOpen(open);
    onSettingsOpenChange?.(open);
  };

  const filteredTabs = tabs.filter(tab =>
    tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tab.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset search when switcher opens
  useEffect(() => {
    if (isVisible) {
      setSearchQuery("");
      setIsSearchFocused(false);
    }
  }, [isVisible]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectedIndex]);

  // Use the keyboard shortcuts hook to handle all keyboard events
  useKeyboardShortcuts({
    enabled: isVisible,
    shortcuts,
    isSearchFocused,
    isSettingsOpen,
    isTabManagementOpen,
    onNavigateNext: () => onNavigate('next'),
    onNavigatePrev: () => onNavigate('prev'),
    onActivateSelected: () => {
      if (filteredTabs[selectedIndex]) {
        onSelectTab(filteredTabs[selectedIndex].id);
      }
    },
    onClose,
    onFocusSearch: () => {
      setIsSearchFocused(true);
      onSearchFocusChange?.(true);
      searchInputRef.current?.focus();
    },
    onBlurSearch: () => {
      setIsSearchFocused(false);
      onSearchFocusChange?.(false);
      searchInputRef.current?.blur();
    },
    onCloseTab: () => {
      if (filteredTabs[selectedIndex]) {
        onCloseTab(filteredTabs[selectedIndex].id);
      }
    },
  });

  if (!isVisible) return null;

  return (
    <>
      <TabManagement
        tabs={tabs}
        isOpen={isTabManagementOpen}
        onClose={() => setIsTabManagementOpen(false)}
        onSelectTab={onSelectTab}
        shortcuts={shortcuts}
        onShortcutsChange={onShortcutsChange}
        settingsThemeToggle={settingsThemeToggle}
      />
      {/* Backdrop - only show for overlay variant */}
      {variant === 'overlay' && (
        <div
          className="fixed inset-0 bg-[hsl(var(--switcher-backdrop))]/20 backdrop-blur-sm z-50"
          onClick={onClose}
        />
      )}

      {/* Tab Switcher Panel */}
      <div
        ref={containerRef}
        className={cn(
          variant === 'overlay' && [
            "fixed z-50",
            "top-4 bottom-4",
            "left-2 right-2 sm:left-auto sm:right-4",
            "w-auto sm:w-[360px]",
            "max-w-[360px]",
          ],
          variant === 'popup' && [
            "w-full h-full",
          ],
          "bg-[hsl(var(--switcher-bg))] rounded-xl",
          "shadow-[0_8px_32px_-8px_hsl(var(--switcher-shadow))]",
          "border border-border/50",
          "flex flex-col overflow-hidden"
        )}
        style={{ isolation: 'isolate' }}
      >
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
                onFocus={() => {
                  setIsSearchFocused(true);
                  onSearchFocusChange?.(true);
                }}
                onBlur={() => {
                  setIsSearchFocused(false);
                  onSearchFocusChange?.(false);
                }}
                placeholder={`Press '${shortcuts.search}' to search tabs...`}
                className={cn(
                  "w-full pl-9 pr-3 py-2 rounded-lg text-sm",
                  "bg-input text-foreground placeholder:text-muted-foreground",
                  "border border-transparent focus:border-ring/30",
                  "outline-none transition-colors"
                )}
              />
            </div>

            {/* Action Icons */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => {
                  if (onOpenTabManagementPage) {
                    onOpenTabManagementPage();
                  } else {
                    setIsTabManagementOpen(true);
                  }
                }}
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Advanced tab management"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>

              <TasSettings
                shortcuts={shortcuts}
                onShortcutsChange={onShortcutsChange}
                onOpenChange={handleSettingsOpenChange}
                themeToggle={settingsThemeToggle}
                onOpenSettingsPage={onOpenSettingsPage}
              />
            </div>
          </div>
        </div>

        {/* Tab List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="px-2 py-2">
            {filteredTabs.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="text-muted-foreground text-sm">
                  No tabs open
                </div>
                <p className="text-xs text-muted-foreground/70">
                  Add a tab to get started
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredTabs.map((tab, index) => (
                  <div
                    key={tab.id}
                    ref={index === selectedIndex ? selectedItemRef : null}
                  >
                    <TabItem
                      tab={tab}
                      isSelected={index === selectedIndex}
                      onClick={() => onSelectTab(tab.id)}
                      onClose={(e) => {
                        e.stopPropagation();
                        onCloseTab(tab.id);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer with shortcuts */}
        <div className="px-3 py-2 border-t border-border/50">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
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
        </div>
      </div>
    </>
  );
};
