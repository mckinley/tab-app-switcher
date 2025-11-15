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
}

export const TabSwitcher = ({ tabs, isVisible, selectedIndex, onSelectTab, onClose, onNavigate }: TabSwitcherProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredTabs = tabs.filter(tab =>
    tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tab.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isVisible]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      // Prevent backtick from being typed in search
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
  }, [isVisible, selectedIndex, filteredTabs, onSelectTab, onClose, onNavigate]);

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Tab Switcher Panel */}
      <div
        ref={containerRef}
        className={cn(
          "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-[600px] max-w-[90vw] max-h-[70vh]",
          "bg-[hsl(var(--switcher-bg))] rounded-2xl",
          "shadow-[0_20px_60px_-15px_hsl(var(--switcher-shadow))]",
          "border border-border/30",
          "animate-in zoom-in-95 fade-in duration-200",
          "flex flex-col overflow-hidden"
        )}
      >
        {/* Search Bar */}
        <div className="p-5 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Tabs"
              className={cn(
                "w-full pl-12 pr-4 py-3 rounded-xl",
                "bg-input text-foreground placeholder:text-muted-foreground",
                "border border-transparent focus:border-ring/30",
                "outline-none transition-all duration-200",
                "text-base"
              )}
            />
          </div>
        </div>

        {/* Tab List */}
        <div className="overflow-y-auto flex-1 px-3 py-2">
          {filteredTabs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No tabs found
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredTabs.map((tab, index) => (
                <TabItem
                  key={tab.id}
                  tab={tab}
                  isSelected={index === selectedIndex}
                  onClick={() => onSelectTab(tab.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer with shortcuts */}
        <div className="px-5 py-3 border-t border-border/20 bg-muted/10">
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-background/30 rounded-md border border-border/30 font-medium">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-background/30 rounded-md border border-border/30 font-medium">↵</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-background/30 rounded-md border border-border/30 font-medium">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
