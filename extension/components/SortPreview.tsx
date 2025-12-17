import { useState, useEffect } from "react"
import { Tab } from "@tas/types/tabs"
import { TabFavicon } from "@tas/components/TabFavicon"

/**
 * SortPreview - A read-only tab list that shows tabs in their current sort order.
 * Gets real-time updates from the background script via port connection.
 * Used in the options page to preview how tabs will be sorted with the current settings.
 */
export function SortPreview() {
  const [tabs, setTabs] = useState<Tab[]>([])

  // Connect to background script for real-time tab updates
  useEffect(() => {
    const port = browser.runtime.connect({ name: "sort-preview" })

    port.onMessage.addListener((message: { type: string; tabs?: Tab[] }) => {
      if (message.type === "TABS_UPDATED" && message.tabs) {
        setTabs(message.tabs)
      }
    })

    return () => {
      port.disconnect()
    }
  }, [])

  if (tabs.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-4">Loading tabs...</div>
  }

  return (
    <div className="space-y-1">
      {tabs.map((tab, index) => (
        <div key={tab.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30">
          <span className="text-xs text-muted-foreground w-4 text-right">{index + 1}</span>
          <TabFavicon src={tab.favicon} className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm truncate">{tab.title}</span>
        </div>
      ))}
    </div>
  )
}
