import { useState, useMemo } from "react";
import { Search, X, ArrowUpDown, Clock, Link as LinkIcon, Type, Settings, User } from "lucide-react";
import { Tab } from "./TabSwitcher";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface TabManagementProps {
  tabs: Tab[];
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tabId: string) => void;
}

type SortOption = "mru" | "mru-reverse" | "url" | "url-reverse" | "title" | "title-reverse";
type ViewMode = "search" | "collections";

export const TabManagement = ({ tabs, isOpen, onClose, onSelectTab }: TabManagementProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("mru");
  const [viewMode, setViewMode] = useState<ViewMode>("search");

  // Group tabs by window (simulated - in real implementation would come from browser API)
  const tabsByWindow = useMemo(() => {
    // For now, we'll just group all tabs as "Window 1"
    return {
      "Window 1": tabs
    };
  }, [tabs]);

  // Filter and sort tabs
  const filteredAndSortedTabs = useMemo(() => {
    let result = [...tabs];

    // Filter by search query
    if (searchQuery) {
      result = result.filter(tab =>
        tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tab.url.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    switch (sortBy) {
      case "mru":
        // Most recently used (current order is assumed to be MRU)
        break;
      case "mru-reverse":
        result.reverse();
        break;
      case "url":
        result.sort((a, b) => a.url.localeCompare(b.url));
        break;
      case "url-reverse":
        result.sort((a, b) => b.url.localeCompare(a.url));
        break;
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title-reverse":
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }

    return result;
  }, [tabs, searchQuery, sortBy]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />

      {/* Tab Management Panel */}
      <div className="fixed inset-2 z-[61] bg-background rounded-lg border shadow-2xl flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-48 border-r bg-muted/30 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm">Tab Manager</h2>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-2">
            <button
              onClick={() => setViewMode("search")}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                viewMode === "search" 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted"
              )}
            >
              <Search className="inline-block w-4 h-4 mr-2" />
              Search
            </button>
            <button
              onClick={() => setViewMode("collections")}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors mt-1",
                viewMode === "collections" 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted"
              )}
            >
              <LinkIcon className="inline-block w-4 h-4 mr-2" />
              Collections
            </button>
          </nav>

          {/* Bottom Links */}
          <div className="p-2 border-t space-y-1">
            <button className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors">
              <User className="inline-block w-4 h-4 mr-2" />
              Account
            </button>
            <button className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors">
              <Settings className="inline-block w-4 h-4 mr-2" />
              Settings
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b p-4 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tabs..."
                className="pl-9"
              />
            </div>
            
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mru">
                  <Clock className="inline-block w-4 h-4 mr-2" />
                  Most Recent
                </SelectItem>
                <SelectItem value="mru-reverse">
                  <Clock className="inline-block w-4 h-4 mr-2" />
                  Least Recent
                </SelectItem>
                <SelectItem value="url">
                  <LinkIcon className="inline-block w-4 h-4 mr-2" />
                  URL (A-Z)
                </SelectItem>
                <SelectItem value="url-reverse">
                  <LinkIcon className="inline-block w-4 h-4 mr-2" />
                  URL (Z-A)
                </SelectItem>
                <SelectItem value="title">
                  <Type className="inline-block w-4 h-4 mr-2" />
                  Title (A-Z)
                </SelectItem>
                <SelectItem value="title-reverse">
                  <Type className="inline-block w-4 h-4 mr-2" />
                  Title (Z-A)
                </SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {viewMode === "search" ? (
              <div className="space-y-2">
                {filteredAndSortedTabs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No tabs found
                  </div>
                ) : (
                  filteredAndSortedTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onSelectTab(tab.id);
                        onClose();
                      }}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={tab.favicon}
                          alt=""
                          className="w-5 h-5 mt-0.5 flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = '/favicon.png';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {tab.title}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {tab.url}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Collections view coming soon
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Tabs by Window */}
        <div className="w-80 border-l bg-muted/30 flex flex-col overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm">Tabs by Window</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {Object.entries(tabsByWindow).map(([windowName, windowTabs]) => (
              <div key={windowName} className="mb-4">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  {windowName} ({windowTabs.length})
                </div>
                <div className="space-y-1">
                  {windowTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onSelectTab(tab.id);
                        onClose();
                      }}
                      className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={tab.favicon}
                          alt=""
                          className="w-4 h-4 flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = '/favicon.png';
                          }}
                        />
                        <span className="text-xs truncate">{tab.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
