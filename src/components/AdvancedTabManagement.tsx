import { useState, useMemo } from "react";
import { X, Search, Trash2, Copy, Bookmark, Clock, Globe, List, LayoutGrid, ChevronDown, GripVertical } from "lucide-react";
import { Tab } from "./TabSwitcher";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface AdvancedTabManagementProps {
  tabs: Tab[];
  isVisible: boolean;
  onClose: () => void;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}

type SortOption = "mru" | "time" | "domain" | "title" | "window";
type ViewMode = "list" | "grid";

interface TabWithMetadata extends Tab {
  windowId?: number;
  lastAccessed?: number;
  isBookmarked?: boolean;
  isDuplicate?: boolean;
}

export const AdvancedTabManagement = ({
  tabs,
  isVisible,
  onClose,
  onSelectTab,
  onCloseTab,
}: AdvancedTabManagementProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("mru");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState<Set<string>>(new Set());

  // Enhanced tabs with metadata (in real extension, this would come from Chrome API)
  const tabsWithMetadata: TabWithMetadata[] = useMemo(() => {
    const urlCount = new Map<string, number>();
    tabs.forEach(tab => {
      const url = tab.url;
      urlCount.set(url, (urlCount.get(url) || 0) + 1);
    });

    return tabs.map((tab, index) => ({
      ...tab,
      windowId: Math.floor(index / 10) + 1, // Mock window grouping
      lastAccessed: Date.now() - index * 60000, // Mock MRU
      isBookmarked: Math.random() > 0.7, // Mock bookmark status
      isDuplicate: (urlCount.get(tab.url) || 0) > 1,
    }));
  }, [tabs]);

  // Filter tabs
  const filteredTabs = useMemo(() => {
    let result = tabsWithMetadata;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        tab =>
          tab.title.toLowerCase().includes(query) ||
          tab.url.toLowerCase().includes(query)
      );
    }

    // Bookmarks filter
    if (showBookmarksOnly) {
      result = result.filter(tab => tab.isBookmarked);
    }

    // Duplicates filter
    if (showDuplicatesOnly) {
      result = result.filter(tab => tab.isDuplicate);
    }

    return result;
  }, [tabsWithMetadata, searchQuery, showBookmarksOnly, showDuplicatesOnly]);

  // Sort tabs
  const sortedTabs = useMemo(() => {
    const sorted = [...filteredTabs];

    switch (sortBy) {
      case "mru":
        sorted.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
        break;
      case "time":
        sorted.sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0));
        break;
      case "domain":
        sorted.sort((a, b) => {
          const domainA = new URL(a.url).hostname;
          const domainB = new URL(b.url).hostname;
          return domainA.localeCompare(domainB);
        });
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "window":
        sorted.sort((a, b) => (a.windowId || 0) - (b.windowId || 0));
        break;
    }

    return sorted;
  }, [filteredTabs, sortBy]);

  // Group by window
  const tabsByWindow = useMemo(() => {
    const groups = new Map<number, TabWithMetadata[]>();
    sortedTabs.forEach(tab => {
      const windowId = tab.windowId || 0;
      if (!groups.has(windowId)) {
        groups.set(windowId, []);
      }
      groups.get(windowId)?.push(tab);
    });
    return groups;
  }, [sortedTabs]);

  // Group by domain
  const tabsByDomain = useMemo(() => {
    const groups = new Map<string, TabWithMetadata[]>();
    sortedTabs.forEach(tab => {
      const domain = new URL(tab.url).hostname;
      if (!groups.has(domain)) {
        groups.set(domain, []);
      }
      groups.get(domain)?.push(tab);
    });
    return groups;
  }, [sortedTabs]);

  const toggleTabSelection = (tabId: string) => {
    const newSelection = new Set(selectedTabs);
    if (newSelection.has(tabId)) {
      newSelection.delete(tabId);
    } else {
      newSelection.add(tabId);
    }
    setSelectedTabs(newSelection);
  };

  const closeBulkTabs = () => {
    selectedTabs.forEach(tabId => onCloseTab(tabId));
    setSelectedTabs(new Set());
  };

  const getDuplicateCount = () => {
    return tabsWithMetadata.filter(tab => tab.isDuplicate).length;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutGrid className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-semibold">Advanced Tab Management</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 h-[calc(100vh-80px)] flex flex-col gap-4">
        {/* Search and Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tabs (title, URL, or content)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mru">Most Recently Used</SelectItem>
              <SelectItem value="time">Time Opened</SelectItem>
              <SelectItem value="domain">Domain</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="window">Window</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters and Stats */}
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant={showBookmarksOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
          >
            <Bookmark className="w-4 h-4 mr-2" />
            Bookmarks Only
          </Button>
          <Button
            variant={showDuplicatesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
          >
            <Copy className="w-4 h-4 mr-2" />
            Duplicates ({getDuplicateCount()})
          </Button>

          <div className="ml-auto flex gap-2 items-center">
            {selectedTabs.size > 0 && (
              <>
                <Badge variant="secondary">{selectedTabs.size} selected</Badge>
                <Button variant="destructive" size="sm" onClick={closeBulkTabs}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Close Selected
                </Button>
              </>
            )}
            <Badge variant="outline">{filteredTabs.length} tabs</Badge>
          </div>
        </div>

        {/* Tabs Display */}
        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="all" className="h-full">
            <TabsList>
              <TabsTrigger value="all">All Tabs</TabsTrigger>
              <TabsTrigger value="windows">By Window</TabsTrigger>
              <TabsTrigger value="domains">By Domain</TabsTrigger>
            </TabsList>

            {/* All Tabs View */}
            <TabsContent value="all" className="mt-4">
              <div
                className={cn(
                  viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                    : "space-y-2"
                )}
              >
                {sortedTabs.map((tab) => (
                  <TabCard
                    key={tab.id}
                    tab={tab}
                    isSelected={selectedTabs.has(tab.id)}
                    onToggleSelect={() => toggleTabSelection(tab.id)}
                    onSelect={() => onSelectTab(tab.id)}
                    onClose={() => onCloseTab(tab.id)}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </TabsContent>

            {/* By Window View */}
            <TabsContent value="windows" className="mt-4 space-y-6">
              {Array.from(tabsByWindow.entries()).map(([windowId, windowTabs]) => (
                <div key={windowId} className="space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" />
                    Window {windowId} ({windowTabs.length} tabs)
                  </h3>
                  <div className="space-y-2 pl-6">
                    {windowTabs.map((tab) => (
                      <TabCard
                        key={tab.id}
                        tab={tab}
                        isSelected={selectedTabs.has(tab.id)}
                        onToggleSelect={() => toggleTabSelection(tab.id)}
                        onSelect={() => onSelectTab(tab.id)}
                        onClose={() => onCloseTab(tab.id)}
                        viewMode="list"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* By Domain View */}
            <TabsContent value="domains" className="mt-4 space-y-6">
              {Array.from(tabsByDomain.entries()).map(([domain, domainTabs]) => (
                <div key={domain} className="space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    {domain} ({domainTabs.length} tabs)
                  </h3>
                  <div className="space-y-2 pl-6">
                    {domainTabs.map((tab) => (
                      <TabCard
                        key={tab.id}
                        tab={tab}
                        isSelected={selectedTabs.has(tab.id)}
                        onToggleSelect={() => toggleTabSelection(tab.id)}
                        onSelect={() => onSelectTab(tab.id)}
                        onClose={() => onCloseTab(tab.id)}
                        viewMode="list"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

// Tab Card Component
interface TabCardProps {
  tab: TabWithMetadata;
  isSelected: boolean;
  onToggleSelect: () => void;
  onSelect: () => void;
  onClose: () => void;
  viewMode: ViewMode;
}

const TabCard = ({
  tab,
  isSelected,
  onToggleSelect,
  onSelect,
  onClose,
  viewMode,
}: TabCardProps) => {
  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 p-3 rounded-lg border transition-all",
        "hover:bg-muted/50 hover:border-primary/50",
        isSelected && "bg-primary/10 border-primary ring-1 ring-primary/30",
        viewMode === "grid" && "flex-col"
      )}
    >
      {/* Selection Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        className="mt-1 cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Favicon */}
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5">
        {tab.favicon ? (
          <img
            src={tab.favicon}
            alt=""
            className="w-4 h-4 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="w-4 h-4 rounded bg-muted" />
        )}
      </div>

      {/* Tab Info */}
      <button
        onClick={onSelect}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="text-sm font-medium text-foreground truncate">
            {tab.title || "Untitled"}
          </div>
          {tab.isBookmarked && (
            <Bookmark className="w-3 h-3 text-primary flex-shrink-0" />
          )}
          {tab.isDuplicate && (
            <Copy className="w-3 h-3 text-destructive flex-shrink-0" />
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate mb-1">
          {tab.url}
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          {tab.windowId && (
            <span className="flex items-center gap-1">
              <LayoutGrid className="w-3 h-3" />
              Window {tab.windowId}
            </span>
          )}
          {tab.lastAccessed && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(tab.lastAccessed).toLocaleTimeString()}
            </span>
          )}
        </div>
      </button>

      {/* Close Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Close tab"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
