import { useState, useEffect, useCallback } from 'react'
import { SortSettings } from '@tas/components/settings/SortSettings'
import {
  sortOrderToStrategy,
  strategyToSortOrder,
  type SortOrder,
  type SortStrategy
} from '@tas/sorting'
import { Button } from '@tab-app-switcher/ui/components/button'
import { RefreshCw } from 'lucide-react'

interface SortSyncStatus {
  nativeStrategy: string
  sessions: Array<{
    browserType: string
    strategy?: string
    inSync: boolean
  }>
  allInSync: boolean
}

export function SortSettingsPanel(): JSX.Element {
  const [sortOrder, setSortOrder] = useState<SortOrder>('activated')
  const [syncStatus, setSyncStatus] = useState<SortSyncStatus | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const refreshSyncStatus = useCallback(async () => {
    if (window.api?.sorting?.getSyncStatus) {
      const status = await window.api.sorting.getSyncStatus()
      setSyncStatus(status)
    }
  }, [])

  // Load initial values
  useEffect(() => {
    if (window.api?.options?.getAppOptions) {
      window.api.options.getAppOptions().then((opts) => {
        if (opts.sortStrategy) {
          setSortOrder(strategyToSortOrder[opts.sortStrategy as SortStrategy])
        }
      })
    }
    refreshSyncStatus()

    // Poll for sync status changes every 3 seconds
    const interval = setInterval(refreshSyncStatus, 3000)
    return () => clearInterval(interval)
  }, [refreshSyncStatus])

  const handleSortOrderChange = async (newOrder: SortOrder): Promise<void> => {
    setSortOrder(newOrder)
    if (window.api?.options?.setAppOption) {
      await window.api.options.setAppOption('sortStrategy', sortOrderToStrategy[newOrder])
    }
    refreshSyncStatus()
  }

  const handleSync = async (): Promise<void> => {
    setIsSyncing(true)
    try {
      if (window.api?.sorting?.syncSortStrategy) {
        await window.api.sorting.syncSortStrategy()
      }
      await refreshSyncStatus()
    } finally {
      setIsSyncing(false)
    }
  }

  const outOfSyncCount = syncStatus?.sessions.filter((s) => !s.inSync).length ?? 0

  return (
    <div className="space-y-6">
      <SortSettings value={sortOrder} onChange={handleSortOrderChange} />

      <div className="pt-6 border-t">
        <h3 className="text-sm font-medium mb-3">Browser Sync</h3>

        {syncStatus === null ? (
          <p className="text-sm text-muted-foreground">Loading sync status...</p>
        ) : syncStatus.sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No browsers connected</p>
        ) : !syncStatus.allInSync ? (
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {outOfSyncCount} browser{outOfSyncCount > 1 ? 's' : ''} using different sorting
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Click sync to apply your settings to all browsers
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync All'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <span className="text-green-600 dark:text-green-400">✓</span>
            <p className="text-sm text-green-700 dark:text-green-300">
              All {syncStatus.sessions.length} browser{syncStatus.sessions.length > 1 ? 's' : ''}{' '}
              using same sort order
            </p>
          </div>
        )}

        {syncStatus && syncStatus.sessions.length > 0 && (
          <div className="mt-3 space-y-1">
            {syncStatus.sessions.map((session, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs text-muted-foreground py-1"
              >
                <span className="capitalize">{session.browserType}</span>
                <span className={session.inSync ? 'text-green-600' : 'text-amber-600'}>
                  {session.strategy
                    ? strategyToSortOrder[session.strategy as SortStrategy] || session.strategy
                    : 'unknown'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
