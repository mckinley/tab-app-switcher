import { useState, ReactNode } from "react"
import { Plus, Trash2, ExternalLink, FolderOpen } from "lucide-react"
import { Button } from "@tab-app-switcher/ui/components/button"
import { Input } from "@tab-app-switcher/ui/components/input"
import type { Collection } from "../types/collections"
import { TabFavicon } from "./TabFavicon"
import { cn } from "@tab-app-switcher/ui/lib/utils"

interface CollectionCardProps {
  collection: Collection
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (newName: string) => void
  onSendToWindow?: () => void
  /** Remove a tab from the collection by its index */
  onRemoveTab?: (tabIndex: number) => void
  /** For DND - wraps the card content */
  wrapper?: (children: ReactNode, isOver: boolean) => ReactNode
  isOver?: boolean
  /** Show tabs always vs only when selected */
  alwaysShowTabs?: boolean
}

export const CollectionCard = ({
  collection,
  isSelected,
  onSelect,
  onDelete,
  onRename,
  onSendToWindow,
  onRemoveTab,
  wrapper,
  isOver = false,
  alwaysShowTabs = false,
}: CollectionCardProps) => {
  const handleNameEdit = (e: React.FormEvent<HTMLHeadingElement>) => {
    const newName = e.currentTarget.textContent?.trim() || collection.name
    if (newName !== collection.name) {
      onRename(newName)
    }
  }

  const content = (
    <div
      className={cn(
        "flex-1 p-4 rounded-lg border cursor-pointer transition-all",
        isSelected && "bg-primary/10 border-primary",
        isOver && "bg-primary/5 border-primary ring-2 ring-primary/20",
        !isSelected && !isOver && "hover:bg-muted/50",
      )}
      onClick={onSelect}
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

      {/* Show tabs in collection */}
      {(alwaysShowTabs || isSelected) && collection.tabs.length > 0 && (
        <div className="space-y-1 mt-3 pt-3 border-t">
          {collection.tabs.map((tab, index) => (
            <div key={`${tab.url}-${index}`} className="flex items-center gap-2 p-2 rounded bg-muted/50 group">
              <TabFavicon src={tab.favicon} className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs truncate flex-1">{tab.title}</span>
              {onRemoveTab && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveTab(index)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (wrapper) {
    return wrapper(content, isOver)
  }

  return content
}

interface CollectionsPanelProps {
  collections: Collection[]
  selectedCollection: string | null
  onSelectCollection: (id: string | null) => void
  onCreateCollection: (name: string) => void
  onDeleteCollection: (id: string) => void
  onRenameCollection: (id: string, newName: string) => void
  onSendToWindow?: (collectionId: string) => void
  /** Remove a tab from a collection by its index */
  onRemoveTab?: (collectionId: string, tabIndex: number) => void
  /** Render prop for DND wrapper on each collection */
  renderCollectionWrapper?: (collectionId: string, children: ReactNode, isOver: boolean) => ReactNode
  /** Map of collection ID to isOver state for DND */
  dropStates?: Map<string, boolean>
  /** Show tabs always vs only when selected */
  alwaysShowTabs?: boolean
}

export const CollectionsPanel = ({
  collections,
  selectedCollection,
  onSelectCollection,
  onCreateCollection,
  onDeleteCollection,
  onRenameCollection,
  onSendToWindow,
  onRemoveTab,
  renderCollectionWrapper,
  dropStates,
  alwaysShowTabs = false,
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
              isSelected={selectedCollection === collection.id}
              onSelect={() => onSelectCollection(selectedCollection === collection.id ? null : collection.id)}
              onDelete={() => onDeleteCollection(collection.id)}
              onRename={(newName) => onRenameCollection(collection.id, newName)}
              onSendToWindow={onSendToWindow ? () => onSendToWindow(collection.id) : undefined}
              onRemoveTab={onRemoveTab ? (tabIndex) => onRemoveTab(collection.id, tabIndex) : undefined}
              isOver={dropStates?.get(collection.id) ?? false}
              alwaysShowTabs={alwaysShowTabs}
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
