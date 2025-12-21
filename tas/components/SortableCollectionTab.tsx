import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Pencil, Trash2 } from "lucide-react"
import { Button } from "@tab-app-switcher/ui/components/button"
import type { CollectionTab } from "../types/collections"
import { TabFavicon } from "./TabFavicon"
import { cn } from "@tab-app-switcher/ui/lib/utils"

interface SortableCollectionTabProps {
  tab: CollectionTab
  onEdit: () => void
  onDelete: () => void
  disabled?: boolean
}

export const SortableCollectionTab = ({ tab, onEdit, onDelete, disabled = false }: SortableCollectionTabProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
    disabled,
  })

  // Standard dnd-kit style pattern
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("flex items-center gap-2 p-2 rounded bg-muted/50 group", isDragging && "opacity-50")}
    >
      {!disabled && (
        <button
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none opacity-0 group-hover:opacity-100 transition-opacity"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <TabFavicon src={tab.favicon} className="w-4 h-4 flex-shrink-0" />
      <span className="text-xs truncate flex-1">{tab.title}</span>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
