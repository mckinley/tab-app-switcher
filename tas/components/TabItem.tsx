import { cn } from "@tab-app-switcher/ui/lib/utils"
import { Tab } from "../types/tabs"
import { X } from "lucide-react"
import { TabFavicon } from "./TabFavicon"
import { BrowserIcon } from "./BrowserIcon"
import { formatRelativeTime } from "../utils/relativeTime"

interface TabItemProps {
  tab: Tab
  isSelected: boolean
  onClick: () => void
  onClose?: (e: React.MouseEvent) => void
  showBrowserIcon?: boolean
}

export const TabItem = ({ tab, isSelected, onClick, onClose, showBrowserIcon }: TabItemProps) => {
  const relativeTime = formatRelativeTime(tab.lastActivated)

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
        "text-left group",
        isSelected
          ? "bg-[hsl(var(--switcher-item-selected))]/10 ring-1 ring-[hsl(var(--switcher-item-selected))]/30"
          : "hover:bg-[hsl(var(--switcher-item-hover))]",
      )}
    >
      {/* Browser Icon (shown when multiple browsers connected) */}
      {showBrowserIcon && tab.browser && (
        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
          <BrowserIcon browser={tab.browser} className="w-3.5 h-3.5" />
        </div>
      )}

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

      {/* Relative Time */}
      {relativeTime && <div className="flex-shrink-0 text-xs text-muted-foreground/70">{relativeTime}</div>}

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
          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 cursor-pointer"
          aria-label="Close tab"
        >
          <X className="w-3.5 h-3.5" />
        </div>
      )}
    </button>
  )
}
