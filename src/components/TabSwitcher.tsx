import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { TabItem } from "./TabItem";
import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon: string;
}

interface TabSwitcherProps {
  tabs: Tab[];
  isVisible: boolean;
  selectedIndex: number;
  onSelectTab: (tabId: string) => void;
  onClose: () => void;
  onNavigate: (direction: 'next' | 'prev') => void;
  onSearchFocusChange?: (isFocused: boolean) => void;
}

export const TabSwitcher = ({ tabs, isVisible, selectedIndex, onSelectTab, onClose, onNavigate, onSearchFocusChange }: TabSwitcherProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

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
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      // "f" key to focus search
      if (e.key === "f" && !isSearchFocused) {
        e.preventDefault();
        setIsSearchFocused(true);
        onSearchFocusChange?.(true);
        searchInputRef.current?.focus();
        return;
      }

      // If search is focused, allow normal typing except for Escape
      if (isSearchFocused) {
        if (e.key === "Escape") {
          e.preventDefault();
          setIsSearchFocused(false);
          onSearchFocusChange?.(false);
          searchInputRef.current?.blur();
        }
        return;
      }

      // When search is NOT focused, prevent backtick from being typed
      if (e.key === "`") {
        e.preventDefault();
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          onNavigate('next');
          break;
        case "ArrowUp":
          e.preventDefault();
          onNavigate('prev');
          break;
        case "Enter":
          e.preventDefault();
          if (filteredTabs[selectedIndex]) {
            onSelectTab(filteredTabs[selectedIndex].id);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, isSearchFocused, selectedIndex, filteredTabs, onSelectTab, onClose, onNavigate]);

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[hsl(var(--switcher-backdrop))]/20 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Tab Switcher Panel */}
      <div
        ref={containerRef}
        className={cn(
          "fixed top-4 right-4 bottom-4 z-50",
          "w-[360px]",
          "bg-[hsl(var(--switcher-bg))] rounded-xl",
          "shadow-[0_8px_32px_-8px_hsl(var(--switcher-shadow))]",
          "border border-border/50",
          "flex flex-col overflow-hidden"
        )}
        style={{ isolation: 'isolate' }}
      >
        {/* Search Bar */}
        <div className="p-3 border-b border-border/50">
          <div className="relative">
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
              placeholder="Press 'f' to search tabs..."
              className={cn(
                "w-full pl-9 pr-3 py-2 rounded-lg text-sm",
                "bg-input text-foreground placeholder:text-muted-foreground",
                "border border-transparent focus:border-ring/30",
                "outline-none transition-colors"
              )}
            />
          </div>
        </div>

        {/* Tab List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="px-2 py-2">
            {filteredTabs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No tabs found
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
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer with shortcuts */}
        <div className="px-3 py-2 border-t border-border/50">
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">F</kbd>
              <span>Search</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">↵</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
