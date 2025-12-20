/**
 * Platform Hooks
 *
 * Provides hooks for consuming platform capabilities in React components.
 * Each hook includes an `isSupported` flag for graceful degradation.
 */

import { useContext, useCallback, useEffect } from "react"
import { PlatformContext } from "./PlatformContext"
import type { PlatformContextValue, ActionResult, ActionCapabilities } from "./types"
import type { CommonSettings } from "../settings/types"
import { resolveTheme, applyThemeToDocument, getSystemPrefersDark, type Theme } from "../theme"
import type { SortOrder } from "../../sorting"
import type { Tab, BrowserType } from "../../types/tabs"
import type { SyncStatus } from "../../components/settings/SettingsSync"

/**
 * Main platform hook
 * Returns the full platform context value
 *
 * @example
 * const { settings, capabilities, tabs, sync } = usePlatform()
 */
export function usePlatform<T extends CommonSettings = CommonSettings>(): PlatformContextValue<T> {
  const context = useContext(PlatformContext)
  if (!context) {
    throw new Error("usePlatform must be used within a PlatformProvider")
  }
  return context as unknown as PlatformContextValue<T>
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings Hooks (convenience wrappers)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convenience hook for settings
 * Same API as the settings module's useSettings hook
 */
export function useSettings<T extends CommonSettings = CommonSettings>(): {
  settings: T | null
  updateSetting: <K extends keyof T>(key: K, value: T[K]) => Promise<void>
  isLoading: boolean
  error: Error | null
  version?: string
} {
  const { settings, updateSetting, isLoading, error, version } = usePlatform<T>()
  return { settings, updateSetting, isLoading, error, version }
}

/**
 * Convenience hook for theme setting
 */
export function useTheme(): {
  theme: Theme
  setTheme: (theme: Theme) => Promise<void>
  isLoading: boolean
} {
  const { settings, updateSetting, isLoading } = usePlatform()

  const setTheme = useCallback((theme: Theme) => updateSetting("theme", theme), [updateSetting])

  return {
    theme: settings?.theme ?? "system",
    setTheme,
    isLoading,
  }
}

/**
 * Hook that automatically applies theme changes to the document
 * Call this once at the root of your app to sync theme with DOM
 *
 * @example
 * function App() {
 *   useApplyTheme()
 *   return <MyContent />
 * }
 */
export function useApplyTheme(): void {
  const { theme } = useTheme()

  useEffect(() => {
    const resolved = resolveTheme(theme, getSystemPrefersDark())
    applyThemeToDocument(resolved)
  }, [theme])

  // Also listen for system preference changes when theme is "system"
  useEffect(() => {
    if (theme !== "system") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = (): void => {
      const resolved = resolveTheme(theme, mediaQuery.matches)
      applyThemeToDocument(resolved)
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])
}

/**
 * Convenience hook for sort order setting
 */
export function useSortOrder(): {
  sortOrder: SortOrder
  setSortOrder: (order: SortOrder) => Promise<void>
  isLoading: boolean
} {
  const { settings, updateSetting, isLoading } = usePlatform()

  const setSortOrder = useCallback((order: SortOrder) => updateSetting("sortOrder", order), [updateSetting])

  return {
    sortOrder: settings?.sortOrder ?? "activated",
    setSortOrder,
    isLoading,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabs Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook for subscribing to real-time tab updates
 *
 * @example
 * const { tabs, isLoading, isSupported } = useTabs()
 * if (!isSupported) return <p>Tabs not available</p>
 * return <SortPreviewBase tabs={tabs} />
 */
export function useTabs(): {
  tabs: Tab[]
  isLoading: boolean
  isSupported: boolean
} {
  const { tabs, tabsLoading, capabilities } = usePlatform()

  return {
    tabs,
    isLoading: tabsLoading,
    isSupported: capabilities.hasTabs,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Native Connection Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook for native app connection status
 *
 * @example
 * const { isConnected, downloadUrl, isSupported } = useNativeConnection()
 * if (!isSupported) return null
 * return <NativeStatusBase isConnected={isConnected} downloadUrl={downloadUrl} />
 */
export function useNativeConnection(): {
  isConnected: boolean
  downloadUrl: string
  isSupported: boolean
} {
  const { nativeConnected, nativeDownloadUrl, capabilities } = usePlatform()

  return {
    isConnected: nativeConnected,
    downloadUrl: nativeDownloadUrl,
    isSupported: capabilities.hasNativeConnection,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Browser Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook for browser detection and shortcuts page
 *
 * @example
 * const { browserType, openShortcutsPage, isSupported } = useBrowser()
 * if (!isSupported) return null
 * return <ChromiumShortcutNoteBase browserType={browserType} onOpenShortcuts={openShortcutsPage} />
 */
export function useBrowser(): {
  browserType: BrowserType
  openShortcutsPage: () => void
  isSupported: boolean
} {
  const { browserType, openShortcutsPage, capabilities } = usePlatform()

  return {
    browserType,
    openShortcutsPage,
    isSupported: capabilities.hasBrowserInfo,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook for settings sync across browsers
 *
 * @example
 * const { syncStatus, sync, isSyncing, isSupported } = useSyncStatus()
 * if (!isSupported) return null
 * return <SettingsSync syncStatus={syncStatus} onSync={sync} isSyncing={isSyncing} />
 */
export function useSyncStatus(): {
  syncStatus: SyncStatus | null
  sync: () => Promise<void>
  isSyncing: boolean
  isSupported: boolean
} {
  const { syncStatus, sync, isSyncing, capabilities } = usePlatform()

  return {
    syncStatus,
    sync,
    isSyncing,
    isSupported: capabilities.hasSync,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Window Actions Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook for opening settings and tab management windows
 *
 * @example
 * const { openSettings, openTabManagement, isSupported } = useWindowActions()
 * if (!isSupported) return null
 * return <Button onClick={openSettings}>Settings</Button>
 */
export function useWindowActions(): {
  openSettings: () => void
  openTabManagement: () => void
  isSupported: boolean
} {
  const { openSettings, openTabManagement, capabilities } = usePlatform()

  return {
    openSettings,
    openTabManagement,
    isSupported: capabilities.hasWindowActions,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Actions Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook for tab actions with capability checking
 *
 * @example
 * const { activateTab, closeTab, refreshTabs, capabilities } = useTabActions()
 * await activateTab(tabId)
 * if (capabilities.canReorderTabs) {
 *   await reorderTabs(tabId, newIndex)
 * }
 */
export function useTabActions(): {
  /** Activate a tab and bring its window to front */
  activateTab: (tabId: string) => Promise<ActionResult>
  /** Close a tab */
  closeTab: (tabId: string) => Promise<ActionResult>
  /** Force refresh the tab list */
  refreshTabs: () => Promise<ActionResult>
  /** Move a tab to a new position */
  reorderTabs: (tabId: string, newIndex: number, targetWindowId?: number) => Promise<ActionResult>
  /** Create a new browser window with tabs */
  createWindowWithTabs: (urls: string[]) => Promise<ActionResult>
  /** Action capabilities for conditional rendering */
  capabilities: ActionCapabilities
} {
  const { activateTab, closeTab, refreshTabs, reorderTabs, createWindowWithTabs, capabilities } = usePlatform()

  return {
    activateTab,
    closeTab,
    refreshTabs,
    reorderTabs,
    createWindowWithTabs,
    capabilities: capabilities.actions,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Hooks (no PlatformProvider required)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook for handling escape key to close overlays
 *
 * @param onClose - Callback to call when escape is pressed
 * @param enabled - Whether the escape handler is active (default: true)
 *
 * @example
 * useEscapeKey(handleClose, isVisible)
 */
export function useEscapeKey(onClose: (() => void) | undefined, enabled = true): void {
  useEffect(() => {
    if (!enabled || !onClose) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [enabled, onClose])
}
