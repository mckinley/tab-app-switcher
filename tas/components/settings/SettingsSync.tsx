/**
 * SettingsSync - Browser sync status and control
 * Platform-agnostic: accepts sync state and callbacks as props
 * Reusable for syncing any settings across browsers
 */
import { Button } from "@tab-app-switcher/ui/components/button"
import { RefreshCw } from "lucide-react"

export interface SyncSession {
  browserType: string
  value?: string
  inSync: boolean
}

export interface SyncStatus {
  sessions: SyncSession[]
  allInSync: boolean
}

export interface SettingsSyncProps {
  /** Current sync status (null while loading) */
  syncStatus: SyncStatus | null
  /** Callback to sync settings to all browsers */
  onSync: () => Promise<void>
  /** Whether sync is in progress */
  isSyncing: boolean
  /** Title for the sync section (default: "Browser Sync") */
  title?: string
  /** Label for what is being synced, used in messages (default: "settings") */
  settingsLabel?: string
  /** Format function for displaying session values */
  formatValue?: (value: string | undefined) => string
  /** Additional CSS classes */
  className?: string
}

export function SettingsSync({
  syncStatus,
  onSync,
  isSyncing,
  title = "Browser Sync",
  settingsLabel = "settings",
  formatValue = (v) => v ?? "unknown",
  className,
}: SettingsSyncProps) {
  const outOfSyncCount = syncStatus?.sessions.filter((s) => !s.inSync).length ?? 0

  return (
    <div className={className}>
      <div className="pt-6 border-t">
        <h3 className="text-sm font-medium mb-3">{title}</h3>

        {syncStatus === null ? (
          <p className="text-sm text-muted-foreground">Loading sync status...</p>
        ) : syncStatus.sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No browsers connected</p>
        ) : !syncStatus.allInSync ? (
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {outOfSyncCount} browser{outOfSyncCount > 1 ? "s" : ""} using different {settingsLabel}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Click sync to apply your settings to all browsers
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onSync}
              disabled={isSyncing}
              className="border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync All"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <span className="text-green-600 dark:text-green-400">✓</span>
            <p className="text-sm text-green-700 dark:text-green-300">
              All {syncStatus.sessions.length} browser{syncStatus.sessions.length > 1 ? "s" : ""} using same{" "}
              {settingsLabel}
            </p>
          </div>
        )}

        {syncStatus && syncStatus.sessions.length > 0 && (
          <div className="mt-3 space-y-1">
            {syncStatus.sessions.map((session, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground py-1">
                <span className="capitalize">{session.browserType}</span>
                <span className={session.inSync ? "text-green-600" : "text-amber-600"}>
                  {formatValue(session.value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
