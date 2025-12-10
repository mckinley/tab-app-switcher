import { useState, useMemo, useEffect, useCallback, type ReactNode } from "react"
import {
  Search,
  X,
  Clock,
  Link as LinkIcon,
  Type,
  Settings as SettingsIcon,
  User,
  ArrowUpDown,
  RefreshCw,
  Plus,
  Layers,
} from "lucide-react"
import { Tab, KeyboardShortcuts } from "../types/tabs"
import type { Collection } from "../types/collections"
import {
  loadCollections,
  saveCollections,
  createCollection,
  addTabToCollection,
  renameCollection,
} from "../utils/collectionsStorage"
import { useAuth } from "../hooks/useAuth"
import { useCollectionsSync } from "../hooks/useCollectionsSync"
import { useIsMobile } from "../hooks/useIsMobile"
import { formatRelativeTime } from "../utils/relativeTime"
import { cn } from "@tab-app-switcher/ui/lib/utils"
import { Input } from "@tab-app-switcher/ui/components/input"
import { Button } from "@tab-app-switcher/ui/components/button"
import { Settings } from "./Settings"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@tab-app-switcher/ui/components/select"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ScrollArea } from "@tab-app-switcher/ui/components/scroll-area"
import { TabFavicon } from "./TabFavicon"
import { CollectionsPanel } from "./CollectionsPanel"

interface TabManagementProps {
  tabs: Tab[]
  onClose: () => void
  onSelectTab: (tabId: string) => void
  onCloseTab?: (tabId: string) => void
  onReorderTabs?: (tabId: string, newIndex: number, targetWindowId?: number) => void // Extension: move tab to new position/window
  onSendCollectionToWindow?: (tabUrls: string[]) => void // Extension: create new window with these URLs
  shortcuts: KeyboardShortcuts
  onShortcutsChange: (shortcuts: KeyboardShortcuts) => void
  settingsThemeToggle?: ReactNode
  /** URL to redirect to after OAuth (website only - uses redirect flow) */
  authRedirectUrl?: string
  /** Custom sign in function (extension uses browser identity API) */
  onSignIn?: () => Promise<void>
  /** Custom sign out function */
  onSignOut?: () => Promise<void>
  /** Controlled collections - if provided, component won't load/save to localStorage */
  collections?: Collection[]
  /** Called when collections change (required if collections is provided) */
  onCollectionsChange?: (collections: Collection[]) => void
}

type SortOption = "mru" | "url" | "title"
type ViewMode = "search" | "collections" | "account" | "settings"

interface SortableTabProps {
  tab: Tab
  onSelect: () => void
  onClose?: () => void
  showClose?: boolean
}

const SortableTab = ({ tab, onSelect, onClose, showClose = false }: SortableTabProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors cursor-grab active:cursor-grabbing",
        isDragging && "z-50",
      )}
      {...attributes}
      {...listeners}
    >
      <TabFavicon src={tab.favicon} className="w-4 h-4 flex-shrink-0" />
      <button
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        className="flex-1 text-left text-xs truncate"
      >
        {tab.title}
      </button>
      {showClose && onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-background rounded"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

/** Wrapper component that makes content droppable */
const DroppableWrapper = ({ id, children }: { id: string; children: (isOver: boolean) => ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id })
  return <div ref={setNodeRef}>{children(isOver)}</div>
}

export const TabManagement = ({
  tabs,
  onClose,
  onSelectTab,
  onCloseTab,
  onReorderTabs,
  onSendCollectionToWindow,
  shortcuts,
  onShortcutsChange,
  settingsThemeToggle,
  authRedirectUrl,
  onSignIn,
  onSignOut,
  collections: controlledCollections,
  onCollectionsChange,
}: TabManagementProps) => {
  // Determine if we're in controlled mode
  const isControlled = controlledCollections !== undefined

  // Check if we're on mobile
  const isMobile = useIsMobile()

  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("mru")
  const [reverseSort, setReverseSort] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("search")
  const [internalCollections, setInternalCollections] = useState<Collection[]>([])
  const [collectionsLoaded, setCollectionsLoaded] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab | null>(null)
  const [tabsByWindowId, setTabsByWindowId] = useState<Map<number, Tab[]>>(new Map())
  const [isDroppedOnCollection, setIsDroppedOnCollection] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showMobileTabsPanel, setShowMobileTabsPanel] = useState(false)

  // Use controlled collections if provided, otherwise use internal state
  const collections = isControlled ? controlledCollections : internalCollections

  // Auth hook for Google sign-in (use custom handlers if provided)
  const {
    user,
    isLoading: isAuthLoading,
    signIn: defaultSignIn,
    signOut: defaultSignOut,
  } = useAuth({
    redirectUrl: authRedirectUrl,
  })
  const signIn = onSignIn ?? defaultSignIn
  const signOut = onSignOut ?? defaultSignOut

  // Sync hook for cloud sync (only in uncontrolled mode - controlled mode manages its own sync)
  const { syncToCloud, refreshFromCloud } = useCollectionsSync({
    user: isControlled ? null : user,
    collections,
    setCollections: isControlled ? () => {} : setInternalCollections,
  })

  // Load collections from localStorage (only in uncontrolled mode)
  useEffect(() => {
    if (!isControlled && !collectionsLoaded) {
      const loaded = loadCollections(tabs)
      setInternalCollections(loaded)
      setCollectionsLoaded(true)
    }
  }, [tabs, collectionsLoaded, isControlled])

  // Save collections to localStorage and sync to cloud (only in uncontrolled mode)
  const updateCollections = useCallback(
    (newCollections: Collection[]) => {
      if (isControlled) {
        onCollectionsChange?.(newCollections)
      } else {
        setInternalCollections(newCollections)
        saveCollections(newCollections)
        syncToCloud(newCollections)
      }
    },
    [isControlled, onCollectionsChange, syncToCloud],
  )

  // Manual refresh from cloud
  const handleRefreshFromCloud = useCallback(async () => {
    setIsSyncing(true)
    try {
      await refreshFromCloud()
    } finally {
      setIsSyncing(false)
    }
  }, [refreshFromCloud])

  // Always include the sensor to avoid hook size warnings from useSensors
  // DnD is disabled on mobile via the event handlers (set to undefined)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  // Get unique window IDs in MRU order for display ordering
  // Since tabs come in MRU order, the first occurrence of each windowId represents
  // the window with the most recently active tab
  // Tabs without windowId are treated as windowId: 0
  const windowIdsInMruOrder = useMemo(() => {
    const seen = new Set<number>()
    const ordered: number[] = []
    tabs.forEach((tab) => {
      const windowId = tab.windowId ?? 0
      if (!seen.has(windowId)) {
        seen.add(windowId)
        ordered.push(windowId)
      }
    })
    return ordered
  }, [tabs])

  // Create mapping from windowId to friendly name based on creation order
  // Chrome assigns incrementing windowIds, so sorting numerically gives creation order
  const windowIdToName = useMemo(() => {
    const sortedByCreation = [...windowIdsInMruOrder].sort((a, b) => a - b)
    const mapping = new Map<number, string>()
    sortedByCreation.forEach((windowId, index) => {
      mapping.set(windowId, `Window ${index + 1}`)
    })
    return mapping
  }, [windowIdsInMruOrder])

  // Sync tabsByWindowId with tabs prop - this is the source of truth for DND
  // Each window has its own array of tabs, sorted by index
  useEffect(() => {
    const grouped = new Map<number, Tab[]>()
    tabs.forEach((tab) => {
      const windowId = tab.windowId ?? 0
      if (!grouped.has(windowId)) {
        grouped.set(windowId, [])
      }
      grouped.get(windowId)!.push(tab)
    })
    // Sort each window's tabs by index
    grouped.forEach((windowTabs) => {
      windowTabs.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    })
    setTabsByWindowId(grouped)
  }, [tabs])

  // Derive currentTabs from tabsByWindowId for compatibility with existing code
  const currentTabs = useMemo(() => {
    const result: Tab[] = []
    tabsByWindowId.forEach((windowTabs) => {
      result.push(...windowTabs)
    })
    return result
  }, [tabsByWindowId])

  // Build display structure in MRU window order
  const tabsByWindow = useMemo(() => {
    const result: Record<string, Tab[]> = {}
    windowIdsInMruOrder.forEach((windowId) => {
      const windowName = windowIdToName.get(windowId) || "Window 1"
      const windowTabs = tabsByWindowId.get(windowId) || []
      if (windowTabs.length > 0) {
        result[windowName] = windowTabs
      }
    })
    return result
  }, [tabsByWindowId, windowIdsInMruOrder, windowIdToName])

  // Filter and sort tabs
  const filteredAndSortedTabs = useMemo(() => {
    let result = [...tabs]

    // Filter by search query
    if (searchQuery) {
      result = result.filter(
        (tab) =>
          tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tab.url.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Sort
    switch (sortBy) {
      case "mru":
        // Most recently used (current order)
        break
      case "url":
        result.sort((a, b) => a.url.localeCompare(b.url))
        break
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
    }

    if (reverseSort) {
      result.reverse()
    }

    return result
  }, [tabs, searchQuery, sortBy, reverseSort])

  const handleDragStart = (event: DragStartEvent) => {
    const tab = currentTabs.find((t) => t.id === event.active.id)
    if (tab) {
      setActiveTab(tab)
      setIsDroppedOnCollection(false)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveTab(null)
      return
    }

    // Check if dropping into a collection
    const collection = collections.find((c) => c.id === over.id)
    if (collection) {
      // Find the tab being dragged
      const draggedTab = currentTabs.find((t) => t.id === active.id)
      if (draggedTab) {
        // Add tab to collection if not already there (by URL)
        const alreadyInCollection = collection.tabs.some((t) => t.url === draggedTab.url)
        if (!alreadyInCollection) {
          updateCollections(collections.map((c) => (c.id === collection.id ? addTabToCollection(c, draggedTab) : c)))
        }
      }
      // Mark as dropped on collection so drag overlay disappears
      setIsDroppedOnCollection(true)
      setActiveTab(null)
      return
    }

    // Handle reordering - the visual state is already correct from handleDragOver
    // Now we just need to call the browser API with the active tab's new position
    const activeTabData = currentTabs.find((t) => t.id === active.id)
    if (activeTabData && activeTabData.windowId !== undefined) {
      const targetWindowId = activeTabData.windowId
      const targetWindowTabs = tabsByWindowId.get(targetWindowId) || []
      const activeIndex = targetWindowTabs.findIndex((t) => t.id === active.id)
      if (activeIndex >= 0) {
        onReorderTabs?.(active.id as string, activeIndex, targetWindowId)
      }
    }

    setActiveTab(null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Skip if over a collection
    if (collections.some((c) => c.id === overId)) return

    // Find which windows contain these tabs
    let activeWindowId: number | undefined
    let overWindowId: number | undefined
    let activeTab: Tab | undefined
    let overTabIndex = -1

    tabsByWindowId.forEach((windowTabs, windowId) => {
      const activeIndex = windowTabs.findIndex((t) => t.id === activeId)
      if (activeIndex >= 0) {
        activeWindowId = windowId
        activeTab = windowTabs[activeIndex]
      }
      const foundOverIndex = windowTabs.findIndex((t) => t.id === overId)
      if (foundOverIndex >= 0) {
        overWindowId = windowId
        overTabIndex = foundOverIndex
      }
    })

    if (!activeTab || activeWindowId === undefined || overWindowId === undefined) return

    // Same window - just reorder within the array
    if (activeWindowId === overWindowId) {
      setTabsByWindowId((prev) => {
        const newMap = new Map(prev)
        const windowTabs = [...(newMap.get(activeWindowId!) || [])]
        const activeIndex = windowTabs.findIndex((t) => t.id === activeId)
        if (activeIndex >= 0 && overTabIndex >= 0 && activeIndex !== overTabIndex) {
          const moved = arrayMove(windowTabs, activeIndex, overTabIndex)
          newMap.set(activeWindowId!, moved)
        }
        return newMap
      })
    } else {
      // Cross-window move - remove from source, insert into target
      setTabsByWindowId((prev) => {
        const newMap = new Map(prev)
        const sourceWindowTabs = [...(newMap.get(activeWindowId!) || [])]
        const targetWindowTabs = [...(newMap.get(overWindowId!) || [])]

        // Remove from source
        const activeIndex = sourceWindowTabs.findIndex((t) => t.id === activeId)
        if (activeIndex >= 0) {
          sourceWindowTabs.splice(activeIndex, 1)
          newMap.set(activeWindowId!, sourceWindowTabs)
        }

        // Insert into target at the position of overTab
        const movedTab = { ...activeTab!, windowId: overWindowId }
        targetWindowTabs.splice(overTabIndex, 0, movedTab)
        newMap.set(overWindowId!, targetWindowTabs)

        return newMap
      })
    }
  }

  const handleDragCancel = () => {
    // Reset to original state from props
    const grouped = new Map<number, Tab[]>()
    tabs.forEach((tab) => {
      const windowId = tab.windowId ?? 0
      if (!grouped.has(windowId)) {
        grouped.set(windowId, [])
      }
      grouped.get(windowId)!.push(tab)
    })
    grouped.forEach((windowTabs) => {
      windowTabs.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    })
    setTabsByWindowId(grouped)
    setActiveTab(null)
    setIsDroppedOnCollection(false)
  }

  const handleDeleteCollection = (collectionId: string) => {
    updateCollections(collections.filter((c) => c.id !== collectionId))
    if (selectedCollection === collectionId) {
      setSelectedCollection(null)
    }
  }

  const handleRenameCollection = (id: string, newName: string) => {
    updateCollections(collections.map((c) => (c.id === id ? renameCollection(c, newName) : c)))
  }

  const handleSendCollectionToWindow = (collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId)
    if (!collection || collection.tabs.length === 0) return

    // If callback is provided (extension mode), use it to create real browser window
    if (onSendCollectionToWindow) {
      const tabUrls = collection.tabs.map((tab) => tab.url)
      onSendCollectionToWindow(tabUrls)
      return
    }

    // Otherwise, simulate for demo (website mode)
    // Create a fake new window ID (higher than any existing)
    const maxWindowId = Math.max(0, ...windowIdsInMruOrder)
    const newWindowId = maxWindowId + 1

    // Create duplicate tabs with new IDs for the new window
    const duplicateTabs: Tab[] = collection.tabs.map((collectionTab, index) => ({
      id: `${collectionTab.url}-${Date.now()}-${Math.random()}`,
      title: collectionTab.title,
      url: collectionTab.url,
      favicon: collectionTab.favicon,
      windowId: newWindowId,
      index,
    }))

    setTabsByWindowId((prev) => {
      const newMap = new Map(prev)
      newMap.set(newWindowId, duplicateTabs)
      return newMap
    })
  }

  const handleCloseTab = (tabId: string) => {
    setTabsByWindowId((prev) => {
      const newMap = new Map(prev)
      newMap.forEach((windowTabs, windowId) => {
        newMap.set(
          windowId,
          windowTabs.filter((t) => t.id !== tabId),
        )
      })
      return newMap
    })
    onCloseTab?.(tabId)
  }

  // Helper: Add tab to collection via dropdown (for mobile)
  const handleAddTabToCollection = (tabId: string, collectionId: string) => {
    const tab = currentTabs.find((t) => t.id === tabId)
    const collection = collections.find((c) => c.id === collectionId)
    if (tab && collection) {
      const alreadyInCollection = collection.tabs.some((t) => t.url === tab.url)
      if (!alreadyInCollection) {
        updateCollections(collections.map((c) => (c.id === collectionId ? addTabToCollection(c, tab) : c)))
      }
    }
  }

  // Mobile navigation button component
  const MobileNavButton = ({ mode, icon: Icon, label }: { mode: ViewMode; icon: typeof Search; label: string }) => (
    <button
      onClick={() => setViewMode(mode)}
      className={cn(
        "flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-md text-xs transition-colors",
        viewMode === mode ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground",
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="truncate">{label}</span>
    </button>
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={isMobile ? undefined : handleDragStart}
      onDragOver={isMobile ? undefined : handleDragOver}
      onDragEnd={isMobile ? undefined : handleDragEnd}
      onDragCancel={isMobile ? undefined : handleDragCancel}
    >
      {/* Tab Management Panel */}
      <div className="w-full h-full flex flex-col md:flex-row overflow-hidden">
        {/* Mobile Navigation Bar */}
        {isMobile && (
          <div className="border-b bg-muted/30 p-2">
            <div className="flex gap-1">
              <MobileNavButton mode="search" icon={Search} label="Search" />
              <MobileNavButton mode="collections" icon={LinkIcon} label="Collections" />
              <MobileNavButton mode="account" icon={User} label="Account" />
              <MobileNavButton mode="settings" icon={SettingsIcon} label="Settings" />
              <button
                onClick={() => setShowMobileTabsPanel(!showMobileTabsPanel)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-md text-xs transition-colors",
                  showMobileTabsPanel ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground",
                )}
              >
                <Layers className="w-4 h-4" />
                <span className="truncate">Tabs</span>
              </button>
            </div>
          </div>
        )}

        {/* Desktop Left Sidebar */}
        {!isMobile && (
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
                  viewMode === "search" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <Search className="inline-block w-4 h-4 mr-2" />
                Search
              </button>
              <button
                onClick={() => setViewMode("collections")}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors mt-1",
                  viewMode === "collections" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
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
                  viewMode === "account" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <User className="inline-block w-4 h-4 mr-2" />
                Account
              </button>
              <button
                onClick={() => setViewMode("settings")}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  viewMode === "settings" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <SettingsIcon className="inline-block w-4 h-4 mr-2" />
                Settings
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b p-2 sm:p-4 flex flex-wrap items-center gap-2 sm:gap-4">
            {viewMode === "search" && (
              <>
                <div className="relative flex-1 min-w-[150px]">
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
                  <SelectTrigger className="w-32 sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[70]">
                    <SelectItem value="mru">
                      <Clock className="inline-block w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Most Recent</span>
                      <span className="sm:hidden">Recent</span>
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
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {viewMode === "search" && (
                <div className="space-y-2">
                  {filteredAndSortedTabs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">No tabs found</div>
                  ) : (
                    filteredAndSortedTabs.map((tab) => {
                      const relativeTime = formatRelativeTime(tab.lastActiveTime)
                      return (
                        <div
                          key={tab.id}
                          className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors group flex items-start gap-3"
                        >
                          <button
                            onClick={() => {
                              onSelectTab(tab.id)
                              onClose()
                            }}
                            className="flex-1 flex items-start gap-3 min-w-0 text-left"
                          >
                            <TabFavicon src={tab.favicon} className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{tab.title}</div>
                              <div className="text-xs text-muted-foreground truncate">{tab.url}</div>
                            </div>
                            {relativeTime && (
                              <div className="flex-shrink-0 text-xs text-muted-foreground/70 mt-0.5">
                                {relativeTime}
                              </div>
                            )}
                          </button>
                          {/* Add to collection dropdown (mobile) */}
                          {isMobile && collections.length > 0 && (
                            <Select
                              value=""
                              onValueChange={(collectionId) => handleAddTabToCollection(tab.id, collectionId)}
                            >
                              <SelectTrigger className="w-8 h-8 p-0 border-0 bg-transparent opacity-0 group-hover:opacity-100 focus:opacity-100 flex-shrink-0">
                                <Plus className="h-4 w-4" />
                              </SelectTrigger>
                              <SelectContent className="z-[70]">
                                {collections.map((collection) => (
                                  <SelectItem key={collection.id} value={collection.id}>
                                    {collection.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {viewMode === "collections" && (
                <CollectionsPanel
                  collections={collections}
                  selectedCollection={selectedCollection}
                  onSelectCollection={setSelectedCollection}
                  onCreateCollection={(name) => {
                    const newCollection = createCollection(name)
                    updateCollections([...collections, newCollection])
                  }}
                  onDeleteCollection={handleDeleteCollection}
                  onRenameCollection={handleRenameCollection}
                  onSendToWindow={handleSendCollectionToWindow}
                  alwaysShowTabs
                  renderCollectionWrapper={(collectionId, children, _isOver) => (
                    <DroppableWrapper id={collectionId}>
                      {(isOver) => <div className={cn(isOver && "ring-2 ring-primary/20 rounded-lg")}>{children}</div>}
                    </DroppableWrapper>
                  )}
                />
              )}

              {viewMode === "account" && (
                <div className="py-12">
                  {isAuthLoading ? (
                    <div className="text-center">
                      <p className="text-muted-foreground">Loading...</p>
                    </div>
                  ) : !user ? (
                    <div className="text-center space-y-4">
                      <p className="text-muted-foreground mb-4">Sign in to sync your tabs across devices</p>
                      <Button onClick={signIn}>
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
                        <h3 className="font-medium mb-2">Account</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={handleRefreshFromCloud} disabled={isSyncing}>
                          <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
                          {isSyncing ? "Syncing..." : "Sync Now"}
                        </Button>
                        <Button variant="outline" onClick={signOut}>
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {viewMode === "settings" && (
                <Settings
                  shortcuts={shortcuts}
                  onShortcutsChange={onShortcutsChange}
                  themeToggle={settingsThemeToggle}
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Sidebar - Current Tabs (Desktop only) */}
        {!isMobile && (
          <div className="w-80 border-l bg-muted/30 flex flex-col overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-sm">Current</h3>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2">
                {Object.entries(tabsByWindow).map(([windowName, windowTabs]) => (
                  <div key={windowName} className="mb-4">
                    {/* Only show window name if there are multiple windows */}
                    {Object.keys(tabsByWindow).length > 1 && (
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                        {windowName} ({windowTabs.length})
                      </div>
                    )}
                    <SortableContext items={windowTabs.map((t) => t.id)}>
                      <div className="space-y-1">
                        {windowTabs.map((tab) => (
                          <SortableTab
                            key={tab.id}
                            tab={tab}
                            onSelect={() => {
                              onSelectTab(tab.id)
                              onClose()
                            }}
                            onClose={onCloseTab ? () => handleCloseTab(tab.id) : undefined}
                            showClose={!!onCloseTab}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Mobile Tabs Panel (slides in from right) */}
        {isMobile && showMobileTabsPanel && (
          <div className="absolute inset-0 z-50 flex">
            <div className="flex-1 bg-black/50" onClick={() => setShowMobileTabsPanel(false)} />
            <div className="w-72 bg-background border-l flex flex-col overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">Current Tabs</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowMobileTabsPanel(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2">
                  {Object.entries(tabsByWindow).map(([windowName, windowTabs]) => (
                    <div key={windowName} className="mb-4">
                      {Object.keys(tabsByWindow).length > 1 && (
                        <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                          {windowName} ({windowTabs.length})
                        </div>
                      )}
                      <div className="space-y-1">
                        {windowTabs.map((tab) => (
                          <div key={tab.id} className="p-2 rounded-md hover:bg-muted/50 flex items-center gap-2 group">
                            <button
                              onClick={() => {
                                onSelectTab(tab.id)
                                onClose()
                              }}
                              className="flex-1 flex items-center gap-2 min-w-0 text-left"
                            >
                              <TabFavicon src={tab.favicon} className="w-4 h-4 flex-shrink-0" />
                              <span className="text-xs truncate">{tab.title}</span>
                            </button>
                            {/* Add to collection dropdown */}
                            {collections.length > 0 && (
                              <Select
                                value=""
                                onValueChange={(collectionId) => handleAddTabToCollection(tab.id, collectionId)}
                              >
                                <SelectTrigger className="w-8 h-8 p-0 border-0 bg-transparent opacity-0 group-hover:opacity-100 focus:opacity-100">
                                  <Plus className="h-4 w-4" />
                                </SelectTrigger>
                                <SelectContent className="z-[70]">
                                  {collections.map((collection) => (
                                    <SelectItem key={collection.id} value={collection.id}>
                                      {collection.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {onCloseTab && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={() => handleCloseTab(tab.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>

      {!isMobile && (
        <DragOverlay dropAnimation={isDroppedOnCollection ? null : undefined}>
          {activeTab && (
            <div className="p-2 rounded-md bg-background border shadow-lg flex items-center gap-2 max-w-64">
              <TabFavicon src={activeTab.favicon} className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs truncate">{activeTab.title}</span>
            </div>
          )}
        </DragOverlay>
      )}
    </DndContext>
  )
}
