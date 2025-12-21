import { useState, ReactNode } from "react"
import { Plus, Trash2, ExternalLink, FolderOpen } from "lucide-react"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Button } from "@tab-app-switcher/ui/components/button"
import { Input } from "@tab-app-switcher/ui/components/input"
import type { Collection, CollectionTab } from "../types/collections"
import { cn } from "@tab-app-switcher/ui/lib/utils"
import { SortableCollectionTab } from "./SortableCollectionTab"
import { AddUrlDialog } from "./AddUrlDialog"
import { EditTabDialog } from "./EditTabDialog"

interface CollectionCardProps {
  collection: Collection
  onDelete: () => void
  onRename: (newName: string) => void
  onSendToWindow?: () => void
  onAddUrl?: (url: string, title?: string) => void
  onEditTab?: (tabId: string, updates: { url?: string; title?: string }) => void
  onDeleteTab?: (tabId: string) => void
  /** For DND - wraps the card content */
  wrapper?: (children: ReactNode, isOver: boolean) => ReactNode
  isOver?: boolean
  isAddingUrl?: boolean
  isEditingTab?: boolean
  disableSorting?: boolean
}

export const CollectionCard = ({
  collection,
  onDelete,
  onRename,
  onSendToWindow,
  onAddUrl,
  onEditTab,
  onDeleteTab,
  wrapper,
  isOver = false,
  isAddingUrl = false,
  isEditingTab = false,
  disableSorting = false,
}: CollectionCardProps) => {
  const [addUrlOpen, setAddUrlOpen] = useState(false)
  const [editingTab, setEditingTab] = useState<CollectionTab | null>(null)

  const handleNameEdit = (e: React.FormEvent<HTMLHeadingElement>) => {
    const newName = e.currentTarget.textContent?.trim() || collection.name
    if (newName !== collection.name) {
      onRename(newName)
    }
  }

  const handleAddUrl = (url: string, title?: string) => {
    onAddUrl?.(url, title)
    setAddUrlOpen(false)
  }

  const handleEditTab = (updates: { url?: string; title?: string }) => {
    if (editingTab) {
      onEditTab?.(editingTab.id, updates)
      setEditingTab(null)
    }
  }

  const handleDeleteTab = () => {
    if (editingTab) {
      onDeleteTab?.(editingTab.id)
      setEditingTab(null)
    }
  }

  const content = (
    <div
      className={cn(
        "flex-1 p-4 rounded-lg border transition-all",
        isOver && "bg-primary/5 border-primary ring-2 ring-primary/20",
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex-1">
          <h3
            className="font-medium outline-none focus:ring-2 focus:ring-primary/20 rounded px-1 -mx-1"
            contentEditable
            suppressContentEditableWarning
            onBlur={handleNameEdit}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
          >
            {collection.name}
          </h3>
          <p className="text-xs text-muted-foreground">{collection.tabs.length} tabs</p>
        </div>
        <div className="flex gap-1">
          {onAddUrl && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                setAddUrlOpen(true)
              }}
              title="Add URL"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          {onSendToWindow && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onSendToWindow()
              }}
              title="Open all tabs in new window"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            title="Delete collection"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sortable tabs in collection */}
      {collection.tabs.length > 0 && (
        <div className="space-y-1 mt-3 pt-3 border-t">
          <SortableContext items={collection.tabs.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {collection.tabs.map((tab) => (
              <SortableCollectionTab
                key={tab.id}
                tab={tab}
                onEdit={() => setEditingTab(tab)}
                onDelete={() => onDeleteTab?.(tab.id)}
                disabled={disableSorting}
              />
            ))}
          </SortableContext>
        </div>
      )}

      {/* Add URL Dialog */}
      <AddUrlDialog open={addUrlOpen} onOpenChange={setAddUrlOpen} onAdd={handleAddUrl} isLoading={isAddingUrl} />

      {/* Edit Tab Dialog */}
      <EditTabDialog
        open={editingTab !== null}
        onOpenChange={(open) => !open && setEditingTab(null)}
        tab={editingTab}
        onSave={handleEditTab}
        onDelete={handleDeleteTab}
        isLoading={isEditingTab}
      />
    </div>
  )

  if (wrapper) {
    return wrapper(content, isOver)
  }

  return content
}

interface CollectionsPanelProps {
  collections: Collection[]
  onCreateCollection: (name: string) => void
  onDeleteCollection: (id: string) => void
  onRenameCollection: (id: string, newName: string) => void
  onSendToWindow?: (collectionId: string) => void
  onAddUrl?: (collectionId: string, url: string, title?: string) => void
  onEditTab?: (collectionId: string, tabId: string, updates: { url?: string; title?: string }) => void
  onDeleteTab?: (collectionId: string, tabId: string) => void
  /** Render prop for DND wrapper on each collection */
  renderCollectionWrapper?: (collectionId: string, children: ReactNode, isOver: boolean) => ReactNode
  /** Map of collection ID to isOver state for DND */
  dropStates?: Map<string, boolean>
  /** Set of collection IDs that are currently adding a URL */
  addingUrlStates?: Set<string>
  /** Set of collection IDs that are currently editing a tab */
  editingTabStates?: Set<string>
  /** Disable tab sorting (e.g., on mobile) */
  disableSorting?: boolean
}

export const CollectionsPanel = ({
  collections,
  onCreateCollection,
  onDeleteCollection,
  onRenameCollection,
  onSendToWindow,
  onAddUrl,
  onEditTab,
  onDeleteTab,
  renderCollectionWrapper,
  dropStates,
  addingUrlStates,
  editingTabStates,
  disableSorting = false,
}: CollectionsPanelProps) => {
  const [newCollectionName, setNewCollectionName] = useState("")

  const handleCreate = () => {
    if (!newCollectionName.trim()) return
    onCreateCollection(newCollectionName.trim())
    setNewCollectionName("")
  }

  return (
    <div className="space-y-4">
      {/* Create Collection */}
      <div className="flex gap-2">
        <Input
          type="text"
          value={newCollectionName}
          onChange={(e) => setNewCollectionName(e.target.value)}
          placeholder="New collection name..."
          className="flex-1 min-w-0"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCreate()
            }
          }}
        />
        <Button onClick={handleCreate} className="flex-shrink-0">
          <Plus className="h-4 w-4" />
          <span className="sr-only">Create</span>
        </Button>
      </div>

      {/* Collections List */}
      <div className="space-y-2">
        {collections.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No collections yet.</p>
            <p className="text-sm">Create one to organize your tabs.</p>
          </div>
        ) : (
          collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onDelete={() => onDeleteCollection(collection.id)}
              onRename={(newName) => onRenameCollection(collection.id, newName)}
              onSendToWindow={onSendToWindow ? () => onSendToWindow(collection.id) : undefined}
              onAddUrl={onAddUrl ? (url, title) => onAddUrl(collection.id, url, title) : undefined}
              onEditTab={onEditTab ? (tabId, updates) => onEditTab(collection.id, tabId, updates) : undefined}
              onDeleteTab={onDeleteTab ? (tabId) => onDeleteTab(collection.id, tabId) : undefined}
              isOver={dropStates?.get(collection.id) ?? false}
              isAddingUrl={addingUrlStates?.has(collection.id) ?? false}
              isEditingTab={editingTabStates?.has(collection.id) ?? false}
              disableSorting={disableSorting}
              wrapper={
                renderCollectionWrapper
                  ? (children, isOver) => renderCollectionWrapper(collection.id, children, isOver)
                  : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  )
}
