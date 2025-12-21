import { useDraggable } from "@dnd-kit/core"
import { GripVertical } from "lucide-react"
import { cn } from "@tab-app-switcher/ui/lib/utils"

interface DraggableWindowHeaderProps {
  windowId: number
  windowName: string
  tabCount: number
}

export const DraggableWindowHeader = ({ windowId, windowName, tabCount }: DraggableWindowHeaderProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `window:${windowId}`,
    data: {
      type: "window",
      windowId,
      windowName,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-1 group cursor-grab active:cursor-grabbing rounded hover:bg-muted/50 transition-colors",
        isDragging && "opacity-50",
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span>
        {windowName} ({tabCount})
      </span>
    </div>
  )
}
