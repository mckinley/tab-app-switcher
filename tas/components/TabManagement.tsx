import { useState, useMemo, useEffect, type ReactNode } from "react";
import { Search, X, Clock, Link as LinkIcon, Type, Settings, User, ArrowUpDown, Plus, Trash2, ExternalLink } from "lucide-react";
import { Tab, KeyboardShortcuts } from "../types/tabs";
import { cn } from "../lib/utils";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { SettingsContent } from "./SettingsContent";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ScrollArea } from "./ui/scroll-area";
import { TabFavicon } from "./TabFavicon";

interface TabManagementProps {
  tabs: Tab[];
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tabId: string) => void;
  onCloseTab?: (tabId: string) => void;
  onReorderTabs?: (tabId: string, newIndex: number) => void; // Extension: move tab to new position
  onSendCollectionToWindow?: (tabUrls: string[]) => void; // Extension: create new window with these URLs
  shortcuts: KeyboardShortcuts;
  onShortcutsChange: (shortcuts: KeyboardShortcuts) => void;
  settingsThemeToggle?: ReactNode;
  variant?: 'dialog' | 'fullpage'; // 'dialog' for overlay mode (default), 'fullpage' for full-page mode
}

type SortOption = "mru" | "url" | "title";
type ViewMode = "search" | "collections" | "account" | "settings";

interface Collection {
  id: string;
  name: string;
  tabIds: string[];
}

interface SortableTabProps {
  tab: Tab;
  onSelect: () => void;
  onClose?: () => void;
  showClose?: boolean;
}

interface DroppableCollectionProps {
  collection: Collection;
  isSelected: boolean;
  tabs: Tab[];
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  onSendToWindow: () => void;
}

const SortableTab = ({ tab, onSelect, onClose, showClose = false }: SortableTabProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors cursor-grab active:cursor-grabbing",
        isDragging && "z-50"
      )}
      {...attributes}
      {...listeners}
    >
      <TabFavicon src={tab.favicon} className="w-4 h-4 flex-shrink-0" />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className="flex-1 text-left text-xs truncate"
      >
        {tab.title}
      </button>
      {showClose && onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-background rounded"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

const DroppableCollection = ({ collection, isSelected, tabs, onSelect, onDelete, onRename, onSendToWindow }: DroppableCollectionProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: collection.id,
  });

  const collectionTabs = tabs.filter(tab => collection.tabIds.includes(tab.id));

  const handleNameEdit = (e: React.FormEvent<HTMLHeadingElement>) => {
    const newName = e.currentTarget.textContent?.trim() || collection.name;
    if (newName !== collection.name) {
      onRename(newName);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "p-4 rounded-lg border cursor-pointer transition-all",
        isSelected && "bg-primary/10 border-primary",
        isOver && "bg-primary/5 border-primary ring-2 ring-primary/20",
        !isSelected && !isOver && "hover:bg-muted/50"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h3
            className="font-medium outline-none focus:ring-2 focus:ring-primary/20 rounded px-1 -mx-1"
            contentEditable
            suppressContentEditableWarning
            onBlur={handleNameEdit}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
          >
            {collection.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {collection.tabIds.length} tabs
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onSendToWindow();
            }}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Show tabs in collection */}
      {collectionTabs.length > 0 && (
        <div className="space-y-1 mt-3 pt-3 border-t">
          {collectionTabs.map(tab => (
            <div key={tab.id} className="flex items-center gap-2 p-2 rounded bg-muted/50">
              <TabFavicon src={tab.favicon} className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs truncate flex-1">{tab.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const TabManagement = ({
  tabs,
  isOpen,
  onClose,
  onSelectTab,
  onCloseTab,
  onReorderTabs,
  onSendCollectionToWindow,
  shortcuts,
  onShortcutsChange,
  settingsThemeToggle,
  variant = 'dialog',
}: TabManagementProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("mru");
  const [reverseSort, setReverseSort] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("search");
  const [collections, setCollections] = useState<Collection[]>(() => {
    const saved = localStorage.getItem('tab-collections');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const [currentTabs, setCurrentTabs] = useState<Tab[]>(tabs);
  const [isDroppedOnCollection, setIsDroppedOnCollection] = useState(false);
  const [tabWindows, setTabWindows] = useState<Record<string, string>>(() => {
    // Initialize all tabs to Window 1
    const windows: Record<string, string> = {};
    tabs.forEach(tab => {
      windows[tab.id] = "Window 1";
    });
    return windows;
  });

  // Save collections to localStorage whenever they change
  const updateCollections = (newCollections: Collection[]) => {
    setCollections(newCollections);
    localStorage.setItem('tab-collections', JSON.stringify(newCollections));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Sync currentTabs with tabs prop when it changes
  useEffect(() => {
    setCurrentTabs(tabs);

    // Create friendly window names based on window ID order
    const uniqueWindowIds = Array.from(new Set(
      tabs.map(tab => tab.windowId).filter((id): id is number => id !== undefined)
    )).sort((a, b) => a - b); // Sort by window ID to get consistent ordering

    const windowIdToName = new Map<number, string>();
    uniqueWindowIds.forEach((windowId, index) => {
      windowIdToName.set(windowId, `Window ${index + 1}`);
    });

    // Update tabWindows with friendly names
    setTabWindows(prev => {
      const updated = { ...prev };
      tabs.forEach(tab => {
        if (tab.windowId !== undefined) {
          // Use friendly window name (Window 1, Window 2, etc.)
          updated[tab.id] = windowIdToName.get(tab.windowId) || "Window 1";
        } else if (!updated[tab.id]) {
          // Fallback for tabs without windowId (e.g., demo site)
          updated[tab.id] = "Window 1";
        }
      });
      return updated;
    });
  }, [tabs]);

  // Group tabs by window and sort by index within each window
  const tabsByWindow = useMemo(() => {
    const grouped: Record<string, Tab[]> = {};
    currentTabs.forEach(tab => {
      const windowName = tabWindows[tab.id] || "Window 1";
      if (!grouped[windowName]) {
        grouped[windowName] = [];
      }
      grouped[windowName].push(tab);
    });

    // Sort tabs within each window by their index
    Object.keys(grouped).forEach(windowName => {
      grouped[windowName].sort((a, b) => {
        const indexA = a.index ?? 0;
        const indexB = b.index ?? 0;
        return indexA - indexB;
      });
    });

    return grouped;
  }, [currentTabs, tabWindows]);

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
        // Most recently used (current order)
        break;
      case "url":
        result.sort((a, b) => a.url.localeCompare(b.url));
        break;
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    if (reverseSort) {
      result.reverse();
    }

    return result;
  }, [tabs, searchQuery, sortBy, reverseSort]);

  const handleDragStart = (event: DragStartEvent) => {
    const tab = currentTabs.find(t => t.id === event.active.id);
    if (tab) {
      setActiveTab(tab);
      setIsDroppedOnCollection(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveTab(null);
      return;
    }

    // Check if dropping into a collection
    const collection = collections.find(c => c.id === over.id);
    if (collection) {
      // Add tab to collection if not already there
      if (!collection.tabIds.includes(active.id as string)) {
        updateCollections(collections.map(c =>
          c.id === collection.id
            ? { ...c, tabIds: [...c.tabIds, active.id as string] }
            : c
        ));
      }
      // Mark as dropped on collection so drag overlay disappears
      setIsDroppedOnCollection(true);
      setActiveTab(null);
      return;
    }

    // Otherwise, handle reordering within current tabs
    if (active.id !== over.id) {
      setCurrentTabs((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);

        // Notify parent of reorder (for extension to move real browser tabs)
        // Find the target tab to get its actual browser index
        const targetTab = items.find(item => item.id === over.id);
        if (targetTab && targetTab.index !== undefined) {
          onReorderTabs?.(active.id as string, targetTab.index);
        }

        return reordered;
      });
    }

    setActiveTab(null);
  };

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) return;
    const newCollection: Collection = {
      id: Date.now().toString(),
      name: newCollectionName,
      tabIds: [],
    };
    updateCollections([...collections, newCollection]);
    setNewCollectionName("");
  };

  const handleDeleteCollection = (collectionId: string) => {
    updateCollections(collections.filter(c => c.id !== collectionId));
    if (selectedCollection === collectionId) {
      setSelectedCollection(null);
    }
  };

  const handleRenameCollection = (id: string, newName: string) => {
    updateCollections(collections.map(c =>
      c.id === id ? { ...c, name: newName } : c
    ));
  };

  const handleSendCollectionToWindow = (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return;

    // Get tabs from the collection
    const collectionTabs = tabs.filter(tab => collection.tabIds.includes(tab.id));
    if (collectionTabs.length === 0) return;

    // If callback is provided (extension mode), use it to create real browser window
    if (onSendCollectionToWindow) {
      const tabUrls = collectionTabs.map(tab => tab.url);
      onSendCollectionToWindow(tabUrls);
      return;
    }

    // Otherwise, simulate for demo (website mode)
    // Find the highest window number
    const windowNumbers = Object.values(tabWindows)
      .map(name => {
        const match = name.match(/Window (\d+)/);
        return match ? parseInt(match[1]) : 0;
      });
    const maxWindowNumber = Math.max(0, ...windowNumbers);
    const newWindowName = `Window ${maxWindowNumber + 1}`;

    // Create duplicate tabs with new IDs for the new window
    const newTabWindows = { ...tabWindows };
    const duplicateTabs: Tab[] = [];

    collectionTabs.forEach(tab => {
      // Create a duplicate tab with a new unique ID
      const duplicateTab: Tab = {
        ...tab,
        id: `${tab.id}-${Date.now()}-${Math.random()}`,
      };
      duplicateTabs.push(duplicateTab);
      newTabWindows[duplicateTab.id] = newWindowName;
    });

    setCurrentTabs([...currentTabs, ...duplicateTabs]);
    setTabWindows(newTabWindows);
  };

  const handleCloseTab = (tabId: string) => {
    setCurrentTabs(currentTabs.filter(t => t.id !== tabId));
    onCloseTab?.(tabId);
  };

  if (!isOpen) return null;

  if (!isOpen) return null;

  const containerClasses = variant === 'fullpage'
    ? "h-screen bg-background flex overflow-hidden"
    : "fixed inset-2 z-[61] bg-background rounded-lg border shadow-2xl flex overflow-hidden";

  return (
    <>
      {/* Backdrop - only show for dialog variant */}
      {variant === 'dialog' && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]"
          onClick={onClose}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Tab Management Panel */}
        <div className={containerClasses}>
        {/* Left Sidebar */}
        <div className="w-40 border-r bg-muted/30 flex flex-col">
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
            <button
              onClick={() => setViewMode("account")}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                viewMode === "account"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <User className="inline-block w-4 h-4 mr-2" />
              Account
            </button>
            <button
              onClick={() => setViewMode("settings")}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                viewMode === "settings"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Settings className="inline-block w-4 h-4 mr-2" />
              Settings
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b p-4 flex items-center gap-4">
            {viewMode === "search" && (
              <>
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
                  <SelectContent className="z-[70]">
                    <SelectItem value="mru">
                      <Clock className="inline-block w-4 h-4 mr-2" />
                      Most Recent
                    </SelectItem>
                    <SelectItem value="url">
                      <LinkIcon className="inline-block w-4 h-4 mr-2" />
                      URL
                    </SelectItem>
                    <SelectItem value="title">
                      <Type className="inline-block w-4 h-4 mr-2" />
                      Title
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant={reverseSort ? "default" : "outline"}
                  size="icon"
                  onClick={() => setReverseSort(!reverseSort)}
                  title="Reverse sort order"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </>
            )}

            {viewMode === "collections" && (
              <div className="flex-1">
                <h2 className="text-lg font-semibold">Collections</h2>
              </div>
            )}

            {viewMode === "account" && (
              <div className="flex-1">
                <h2 className="text-lg font-semibold">Account</h2>
              </div>
            )}

            {viewMode === "settings" && (
              <div className="flex-1">
                <h2 className="text-lg font-semibold">Settings</h2>
              </div>
            )}

            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {viewMode === "search" && (
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
                          <TabFavicon src={tab.favicon} className="w-5 h-5 mt-0.5 flex-shrink-0" />
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
              )}

              {viewMode === "collections" && (
                <div className="space-y-4">
                  {/* Create Collection */}
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      placeholder="New collection name..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateCollection();
                        }
                      }}
                    />
                    <Button onClick={handleCreateCollection}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create
                    </Button>
                  </div>

                  {/* Collections List */}
                  <div className="space-y-2">
                    {collections.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        No collections yet. Create one to organize your tabs.
                      </div>
                    ) : (
                      collections.map((collection) => (
                        <DroppableCollection
                          key={collection.id}
                          collection={collection}
                          isSelected={selectedCollection === collection.id}
                          tabs={tabs}
                          onSelect={() => setSelectedCollection(
                            selectedCollection === collection.id ? null : collection.id
                          )}
                          onDelete={() => handleDeleteCollection(collection.id)}
                          onRename={(newName) => handleRenameCollection(collection.id, newName)}
                          onSendToWindow={() => handleSendCollectionToWindow(collection.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}

              {viewMode === "account" && (
                <div className="py-12">
                  {!isSignedIn ? (
                    <div className="text-center space-y-4">
                      <p className="text-muted-foreground mb-4">
                        Sign in to sync your tabs across devices
                      </p>
                      <Button onClick={() => setIsSignedIn(true)}>
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Sign in with Google
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border">
                        <h3 className="font-medium mb-2">Account Information</h3>
                        <p className="text-sm text-muted-foreground">
                          Signed in with Google
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => setIsSignedIn(false)}>
                        Sign Out
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {viewMode === "settings" && (
                <SettingsContent
                  shortcuts={shortcuts}
                  onShortcutsChange={onShortcutsChange}
                  showActions={false}
                  themeToggle={settingsThemeToggle}
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Sidebar - Current Tabs */}
        <div className="w-80 border-l bg-muted/30 flex flex-col overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm">Current</h3>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              {Object.entries(tabsByWindow).map(([windowName, windowTabs]) => (
                  <div key={windowName} className="mb-4">
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                      {windowName} ({windowTabs.length})
                    </div>
                    <SortableContext
                      items={windowTabs.map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1">
                        {windowTabs.map((tab) => (
                          <SortableTab
                            key={tab.id}
                            tab={tab}
                            onSelect={() => {
                              onSelectTab(tab.id);
                              onClose();
                            }}
                            onClose={() => handleCloseTab(tab.id)}
                            showClose={true}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </div>
      </div>

        <DragOverlay dropAnimation={isDroppedOnCollection ? null : undefined}>
          {activeTab && (
            <div className="p-2 rounded-md bg-background border shadow-lg flex items-center gap-2">
              <TabFavicon src={activeTab.favicon} className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs truncate">{activeTab.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
};
