/**
 * Native Platform Adapter
 *
 * Implements PlatformAdapter for Electron native app.
 * Extends NativeSettingsAdapter with sync functionality.
 */

import type {
  PlatformAdapter,
  PlatformCapabilities,
  ActionResult,
  ActionCapabilities
} from '@tas/lib/platform'
import type { NativeSettings } from '@tas/lib/settings'
import type { SyncStatus } from '@tas/components/settings'
import type { Tab } from '@tas/types/tabs'
import {
  sortOrderToStrategy,
  strategyToSortOrder,
  type SortOrder,
  type SortStrategy
} from '@tas/sorting'
import {
  applyThemeToDocument,
  resolveTheme,
  getSystemPrefersDark,
  type Theme
} from '@tas/lib/theme'

export class NativePlatformAdapter implements PlatformAdapter<NativeSettings> {
  // ─────────────────────────────────────────────────────────────────────────────
  // Platform Capabilities
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Action capabilities - can be overridden by subclasses
   */
  protected actionCapabilities: ActionCapabilities = {
    canActivateTab: true,
    canCloseTab: true,
    canRefreshTabs: true,
    canReorderTabs: false,
    canCreateWindow: false
  }

  capabilities: PlatformCapabilities = {
    hasTabs: true,
    hasNativeConnection: false,
    hasBrowserInfo: false,
    hasSync: true,
    actions: this.actionCapabilities
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Settings (from SettingsAdapter)
  // ─────────────────────────────────────────────────────────────────────────────

  async load(): Promise<NativeSettings> {
    if (!window.api?.options?.getAppOptions) {
      throw new Error('Native API not available')
    }

    const opts = await window.api.options.getAppOptions()

    // Apply theme on load
    const resolved = resolveTheme(opts.theme as Theme, getSystemPrefersDark())
    applyThemeToDocument(resolved)

    return {
      theme: opts.theme as Theme,
      sortOrder: strategyToSortOrder[opts.sortStrategy as SortStrategy],
      launchOnLogin: opts.launchOnLogin,
      hideMenuBarIcon: opts.hideMenuBarIcon,
      checkUpdatesAutomatically: opts.checkUpdatesAutomatically
    }
  }

  async save<K extends keyof NativeSettings>(key: K, value: NativeSettings[K]): Promise<void> {
    if (!window.api?.options?.setAppOption) {
      throw new Error('Native API not available')
    }

    // Map sortOrder to sortStrategy for storage
    if (key === 'sortOrder') {
      await window.api.options.setAppOption('sortStrategy', sortOrderToStrategy[value as SortOrder])
    } else {
      await window.api.options.setAppOption(key, value)
    }

    // Apply theme changes immediately
    if (key === 'theme') {
      const resolved = resolveTheme(value as Theme, getSystemPrefersDark())
      applyThemeToDocument(resolved)
    }
  }

  subscribe(callback: (settings: Partial<NativeSettings>) => void): () => void {
    // Listen for theme changes from main process
    if (window.api?.options?.onThemeChanged) {
      window.api.options.onThemeChanged((theme) => {
        const resolved = resolveTheme(theme as Theme, getSystemPrefersDark())
        applyThemeToDocument(resolved)
        callback({ theme: theme as Theme })
      })
    }

    // No cleanup function available from current API
    return () => {}
  }

  async getVersion(): Promise<string> {
    if (!window.api?.about?.getAboutInfo) {
      return ''
    }
    const info = await window.api.about.getAboutInfo()
    return info.version
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tabs
  // ─────────────────────────────────────────────────────────────────────────────

  subscribeTabs(callback: (tabs: Tab[]) => void): () => void {
    // Request initial tabs from main process
    window.electron.ipcRenderer.send('request-tabs')

    // Subscribe to tab updates
    const handler = (_event: unknown, tabs: Tab[]): void => {
      callback(tabs)
    }

    const unsubscribe = window.electron.ipcRenderer.on('tabs-updated', handler)

    return () => {
      unsubscribe()
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Settings Sync
  // ─────────────────────────────────────────────────────────────────────────────

  async getSyncStatus(): Promise<SyncStatus> {
    if (!window.api?.sorting?.getSyncStatus) {
      return { sessions: [], allInSync: true }
    }

    const status = await window.api.sorting.getSyncStatus()

    // Map the API response to SyncStatus format
    return {
      sessions: status.sessions.map(
        (s: { browserType: string; strategy?: string; inSync: boolean }) => ({
          browserType: s.browserType,
          value: s.strategy
            ? strategyToSortOrder[s.strategy as SortStrategy] || s.strategy
            : undefined,
          inSync: s.inSync
        })
      ),
      allInSync: status.allInSync
    }
  }

  async syncSettings(): Promise<void> {
    if (!window.api?.sorting?.syncSortStrategy) {
      return
    }

    await window.api.sorting.syncSortStrategy()
  }

  subscribeSyncStatus(callback: (status: SyncStatus) => void): () => void {
    let intervalId: ReturnType<typeof setInterval> | null = null

    const refreshStatus = async (): Promise<void> => {
      const status = await this.getSyncStatus()
      callback(status)
    }

    // Initial fetch
    refreshStatus()

    // Poll every 3 seconds
    intervalId = setInterval(refreshStatus, 3000)

    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tab Actions
  // ─────────────────────────────────────────────────────────────────────────────

  async activateTab(tabId: string): Promise<ActionResult> {
    window.electron.ipcRenderer.send('activate-tab', tabId)
    return { success: true }
  }

  async closeTab(tabId: string): Promise<ActionResult> {
    window.electron.ipcRenderer.send('close-tab', tabId)
    return { success: true }
  }

  async refreshTabs(): Promise<ActionResult> {
    window.electron.ipcRenderer.send('refresh-tabs')
    return { success: true }
  }

  async reorderTabs(
    _tabId: string,
    _newIndex: number,
    _targetWindowId?: number
  ): Promise<ActionResult> {
    return { success: false, error: 'Not supported in this context' }
  }

  async createWindowWithTabs(_urls: string[]): Promise<ActionResult> {
    return { success: false, error: 'Not supported in this context' }
  }
}

/**
 * Singleton instance of the native platform adapter
 */
export const nativePlatformAdapter = new NativePlatformAdapter()
