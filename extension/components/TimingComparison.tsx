import { useState, useEffect } from "react"
import { Tab } from "@tas/types/tabs"
import { TabFavicon } from "@tas/components/TabFavicon"
import { RefreshCw } from "lucide-react"

type SortField = "lastAccessed" | "lastActivated" | "lastDeactivated"

function formatTime(timestamp: number | undefined, relative: boolean): string {
  if (!timestamp) return "—"
  if (relative) {
    const seconds = Math.round((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ${seconds % 60}s ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m ago`
  }
  return new Date(timestamp).toLocaleTimeString()
}

export function TimingComparison() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [sortBy, setSortBy] = useState<SortField>("lastActivated")
  const [showRelative, setShowRelative] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now())

  const fetchTabs = () => {
    browser.runtime.sendMessage({ type: "GET_TABS" }).then((response) => {
      if (response?.tabs) {
        setTabs(response.tabs)
        setLastRefresh(Date.now())
      }
    })
  }

  useEffect(() => {
    fetchTabs()
  }, [])

  const sortedTabs = [...tabs].sort((a, b) => {
    const aTime = a[sortBy] ?? 0
    const bTime = b[sortBy] ?? 0
    return bTime - aTime // Descending (most recent first)
  })

  const sortButtons: { field: SortField; label: string }[] = [
    { field: "lastAccessed", label: "Chrome Accessed" },
    { field: "lastActivated", label: "TAS Activated" },
    { field: "lastDeactivated", label: "TAS Deactivated" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {sortButtons.map(({ field, label }) => (
            <button
              key={field}
              onClick={() => setSortBy(field)}
              className={`px-2 py-1 text-xs rounded ${
                sortBy === field
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRelative(!showRelative)}
            className="px-2 py-1 text-xs rounded bg-muted text-muted-foreground hover:bg-muted/80"
          >
            {showRelative ? "Relative" : "Absolute"}
          </button>
          <button
            onClick={fetchTabs}
            className="p-1 rounded bg-muted text-muted-foreground hover:bg-muted/80"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Refreshed {formatTime(lastRefresh, true)} • Switch tabs/windows then refresh
      </p>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 font-medium">#</th>
              <th className="text-left p-2 font-medium">Tab</th>
              <th className="text-left p-2 font-medium">Chrome</th>
              <th className="text-left p-2 font-medium">TAS</th>
              <th className="text-left p-2 font-medium">Deactivated</th>
            </tr>
          </thead>
          <tbody>
            {sortedTabs.map((tab, index) => (
              <tr key={tab.id} className="border-t">
                <td className="p-2 text-muted-foreground">{index + 1}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <TabFavicon src={tab.favicon} className="w-4 h-4" />
                    <span className="truncate max-w-[200px]">{tab.title}</span>
                  </div>
                </td>
                <td className="p-2 text-muted-foreground">
                  {formatTime(tab.lastAccessed, showRelative)}
                </td>
                <td className="p-2 text-muted-foreground">
                  {formatTime(tab.lastActivated, showRelative)}
                </td>
                <td className="p-2 text-muted-foreground">
                  {formatTime(tab.lastDeactivated, showRelative)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Chrome Accessed:</strong> Built-in Chrome lastAccessed timestamp.</p>
        <p><strong>TAS Activated:</strong> When TAS detected this tab gained focus.</p>
        <p><strong>TAS Deactivated:</strong> When TAS detected this tab lost focus.</p>
      </div>
    </div>
  )
}

