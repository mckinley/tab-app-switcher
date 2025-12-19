/**
 * SortPreview - A read-only tab list that shows tabs in their current sort order
 *
 * Displays a numbered list of tabs with favicons to preview how they will be sorted.
 */
import { Tab } from "../../types/tabs"
import { TabFavicon } from "../TabFavicon"

export interface SortPreviewProps {
  /** The tabs to display in sorted order */
  tabs: Tab[]
  /** Message to show when loading (default: "Loading tabs...") */
  loadingMessage?: string
  /** Additional CSS classes */
  className?: string
}

export const SortPreview = ({ tabs, loadingMessage = "Loading tabs...", className }: SortPreviewProps) => {
  if (tabs.length === 0) {
    return (
      <div className={className}>
        <div className="text-sm text-muted-foreground text-center py-4">{loadingMessage}</div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-1">
        {tabs.map((tab, index) => (
          <div key={tab.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30">
            <span className="text-xs text-muted-foreground w-4 text-right">{index + 1}</span>
            <TabFavicon src={tab.favicon} className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm truncate">{tab.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
