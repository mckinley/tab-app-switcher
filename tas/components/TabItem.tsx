import { cn } from "../lib/utils"
import { Tab } from "../types/tabs"
import { X } from "lucide-react"
import { TabFavicon } from "./TabFavicon"

interface TabItemProps {
  tab: Tab
  isSelected: boolean
  onClick: () => void
  onClose?: (e: React.MouseEvent) => void
}

export const TabItem = ({ tab, isSelected, onClick, onClose }: TabItemProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
        "transition-colors",
        "text-left group",
        isSelected
          ? "bg-[hsl(var(--switcher-item-selected))]/10 ring-1 ring-[hsl(var(--switcher-item-selected))]/30"
          : "hover:bg-[hsl(var(--switcher-item-hover))]",
      )}
    >
      {/* Favicon */}
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {tab.favicon ? (
          <TabFavicon src={tab.favicon} className="w-4 h-4 object-contain" />
        ) : (
          <div className="w-4 h-4 rounded bg-muted" />
        )}
      </div>

      {/* Title and URL */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{tab.title || "Untitled"}</div>
        <div className="text-xs text-muted-foreground truncate">{tab.url}</div>
      </div>

      {/* Close Button */}
      {onClose && (
        <div
          onClick={onClose}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onClose(e as unknown as React.MouseEvent)
            }
          }}
          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
          aria-label="Close tab"
        >
          <X className="w-3.5 h-3.5" />
        </div>
      )}
    </button>
  )
}
