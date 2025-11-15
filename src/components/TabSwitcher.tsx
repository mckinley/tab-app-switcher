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
          "fixed top-16 right-8 w-96 max-h-[80vh]",
          "bg-[hsl(var(--switcher-bg))] rounded-xl shadow-2xl",
          "border border-border/50",
          "animate-in slide-in-from-right-4 fade-in duration-200",
          "flex flex-col"
        )}
      >
        {/* Search Bar */}
        <div className="p-4 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tabs..."
              className={cn(
                "w-full pl-10 pr-4 py-2 rounded-lg",
                "bg-input text-foreground placeholder:text-muted-foreground",
                "border border-border/50 focus:border-ring",
                "outline-none transition-colors duration-150",
                "text-sm"
              )}
            />
          </div>
        </div>

        {/* Tab List */}
        <div className="overflow-y-auto flex-1 p-2">
          {filteredTabs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No tabs found
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTabs.map((tab, index) => (
                <TabItem
                  key={tab.id}
                  tab={tab}
                  isSelected={index === selectedIndex}
                  shortcutNumber={index < 9 ? index + 1 : undefined}
                  onClick={() => onSelectTab(tab.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="p-3 border-t border-border/50 text-xs text-muted-foreground text-center">
          <span className="inline-flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd>
            Navigate
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd>
            Select
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </>
  );
};
