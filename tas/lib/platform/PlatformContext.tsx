/**
 * Platform Context
 *
 * Provides React context for platform capabilities across different environments.
 * Each platform provides its own adapter implementation.
 */

/* eslint-disable react-refresh/only-export-components -- Exports context alongside provider */
import { createContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { Tab, BrowserType } from "../../types/tabs"
import type { SyncStatus } from "../../components/settings/SettingsSync"
import type { CommonSettings } from "../settings/types"
import type { PlatformAdapter, PlatformContextValue, PlatformCapabilities, ActionResult } from "./types"
import { DEFAULT_CAPABILITIES, DEFAULT_NATIVE_DOWNLOAD_URL } from "./types"

/**
 * React context for platform capabilities
 */
export const PlatformContext = createContext<PlatformContextValue<CommonSettings> | null>(null)

export interface PlatformProviderProps<T extends CommonSettings> {
  /** Platform-specific adapter */
  adapter: PlatformAdapter<T>
  /** Children to render */
  children: ReactNode
}

/**
 * Platform provider component
 * Wraps children with platform context using the provided adapter
 */
export function PlatformProvider<T extends CommonSettings>({
  adapter,
  children,
}: PlatformProviderProps<T>): JSX.Element {
  // ─────────────────────────────────────────────────────────────────────────────
  // Settings state (from SettingsAdapter)
  // ─────────────────────────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [version, setVersion] = useState<string | undefined>()

  // ─────────────────────────────────────────────────────────────────────────────
  // Platform state
  // ─────────────────────────────────────────────────────────────────────────────
  const [tabs, setTabs] = useState<Tab[]>([])
  const [tabsLoading, setTabsLoading] = useState(true)
  const [nativeConnected, setNativeConnected] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // Get capabilities from adapter
  const capabilities: PlatformCapabilities = adapter.capabilities ?? DEFAULT_CAPABILITIES

  // Get static values from adapter
  const nativeDownloadUrl = adapter.getNativeDownloadUrl?.() ?? DEFAULT_NATIVE_DOWNLOAD_URL
  const browserType: BrowserType = adapter.getBrowserType?.() ?? "unknown"

  // ─────────────────────────────────────────────────────────────────────────────
  // Settings: Load initial settings
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true

    async function loadSettings(): Promise<void> {
      try {
        const loaded = await adapter.load()
        if (mounted) {
          setSettings(loaded)
          setIsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setIsLoading(false)
        }
      }
    }

    loadSettings()

    // Load version if available
    if (adapter.getVersion) {
      adapter.getVersion().then((v) => {
        if (mounted) setVersion(v)
      })
    }

    return () => {
      mounted = false
    }
  }, [adapter])

  // ─────────────────────────────────────────────────────────────────────────────
  // Settings: Subscribe to external changes
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!adapter.subscribe) return

    return adapter.subscribe((partialSettings) => {
      setSettings((prev) => (prev ? { ...prev, ...partialSettings } : null))
    })
  }, [adapter])

  // ─────────────────────────────────────────────────────────────────────────────
  // Tabs: Subscribe to tab updates
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!capabilities.hasTabs || !adapter.subscribeTabs) {
      setTabsLoading(false)
      return
    }

    return adapter.subscribeTabs((newTabs) => {
      setTabs(newTabs)
      setTabsLoading(false)
    })
  }, [adapter, capabilities.hasTabs])

  // ─────────────────────────────────────────────────────────────────────────────
  // Native Connection: Subscribe to connection status
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!capabilities.hasNativeConnection || !adapter.subscribeNativeConnection) {
      return
    }

    return adapter.subscribeNativeConnection((isConnected) => {
      setNativeConnected(isConnected)
    })
  }, [adapter, capabilities.hasNativeConnection])

  // ─────────────────────────────────────────────────────────────────────────────
  // Sync: Subscribe to sync status
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!capabilities.hasSync || !adapter.subscribeSyncStatus) {
      return
    }

    return adapter.subscribeSyncStatus((status) => {
      setSyncStatus(status)
    })
  }, [adapter, capabilities.hasSync])

  // ─────────────────────────────────────────────────────────────────────────────
  // Callbacks
  // ─────────────────────────────────────────────────────────────────────────────

  const updateSetting = useCallback(
    async <K extends keyof T>(key: K, value: T[K]): Promise<void> => {
      if (!settings) return

      // Optimistic update
      const previousSettings = settings
      setSettings({ ...settings, [key]: value })

      try {
        await adapter.save(key, value)
      } catch (err) {
        // Revert on error
        setSettings(previousSettings)
        throw err
      }
    },
    [adapter, settings],
  )

  const openShortcutsPage = useCallback(() => {
    adapter.openShortcutsPage?.()
  }, [adapter])

  const sync = useCallback(async () => {
    if (!capabilities.hasSync || !adapter.syncSettings) return

    setIsSyncing(true)
    try {
      await adapter.syncSettings()
      // Refresh sync status after syncing
      if (adapter.getSyncStatus) {
        const status = await adapter.getSyncStatus()
        setSyncStatus(status)
      }
    } finally {
      setIsSyncing(false)
    }
  }, [adapter, capabilities.hasSync])

  // ─────────────────────────────────────────────────────────────────────────────
  // Tab Actions
  // ─────────────────────────────────────────────────────────────────────────────

  const activateTab = useCallback(
    async (tabId: string): Promise<ActionResult> => {
      if (!capabilities.actions.canActivateTab || !adapter.activateTab) {
        return { success: false, error: "Action not supported" }
      }
      return adapter.activateTab(tabId)
    },
    [adapter, capabilities.actions.canActivateTab],
  )

  const closeTab = useCallback(
    async (tabId: string): Promise<ActionResult> => {
      if (!capabilities.actions.canCloseTab || !adapter.closeTab) {
        return { success: false, error: "Action not supported" }
      }
      return adapter.closeTab(tabId)
    },
    [adapter, capabilities.actions.canCloseTab],
  )

  const refreshTabs = useCallback(async (): Promise<ActionResult> => {
    if (!capabilities.actions.canRefreshTabs || !adapter.refreshTabs) {
      return { success: false, error: "Action not supported" }
    }
    return adapter.refreshTabs()
  }, [adapter, capabilities.actions.canRefreshTabs])

  const reorderTabs = useCallback(
    async (tabId: string, newIndex: number, targetWindowId?: number): Promise<ActionResult> => {
      if (!capabilities.actions.canReorderTabs || !adapter.reorderTabs) {
        return { success: false, error: "Action not supported" }
      }
      return adapter.reorderTabs(tabId, newIndex, targetWindowId)
    },
    [adapter, capabilities.actions.canReorderTabs],
  )

  const createWindowWithTabs = useCallback(
    async (urls: string[]): Promise<ActionResult> => {
      if (!capabilities.actions.canCreateWindow || !adapter.createWindowWithTabs) {
        return { success: false, error: "Action not supported" }
      }
      return adapter.createWindowWithTabs(urls)
    },
    [adapter, capabilities.actions.canCreateWindow],
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Context value
  // ─────────────────────────────────────────────────────────────────────────────

  const contextValue: PlatformContextValue<T> = {
    // Settings
    settings,
    isLoading,
    error,
    updateSetting,
    version,

    // Platform capabilities
    capabilities,

    // Tabs
    tabs,
    tabsLoading,

    // Native connection
    nativeConnected,
    nativeDownloadUrl,

    // Browser info
    browserType,
    openShortcutsPage,

    // Sync
    syncStatus,
    isSyncing,
    sync,

    // Tab Actions
    activateTab,
    closeTab,
    refreshTabs,
    reorderTabs,
    createWindowWithTabs,
  }

  return (
    <PlatformContext.Provider value={contextValue as unknown as PlatformContextValue<CommonSettings>}>
      {children}
    </PlatformContext.Provider>
  )
}
