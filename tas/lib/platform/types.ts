/**
 * Platform Adapter Types
 *
 * Extends the Settings Adapter pattern to cover all platform-specific capabilities.
 * Each platform implements what it supports; hooks check capabilities before use.
 */

import type { Tab, BrowserType } from "../../types/tabs"
import type { SyncStatus } from "../../components/settings/SettingsSync"
import type { CommonSettings, SettingsAdapter } from "../settings/types"

/**
 * Result of a tab action
 */
export interface ActionResult {
  success: boolean
  error?: string
}

/**
 * Action capabilities - which tab actions are supported
 */
export interface ActionCapabilities {
  /** Can activate/focus a tab */
  canActivateTab: boolean
  /** Can close tabs */
  canCloseTab: boolean
  /** Can refresh tab list */
  canRefreshTabs: boolean
  /** Can reorder tabs within/across windows */
  canReorderTabs: boolean
  /** Can create new window with tabs */
  canCreateWindow: boolean
}

/**
 * Default action capabilities - all disabled
 */
export const DEFAULT_ACTION_CAPABILITIES: ActionCapabilities = {
  canActivateTab: false,
  canCloseTab: false,
  canRefreshTabs: false,
  canReorderTabs: false,
  canCreateWindow: false,
}

/**
 * Platform capabilities - indicates what features each platform supports
 */
export interface PlatformCapabilities {
  /** Can subscribe to real-time tab updates */
  hasTabs: boolean
  /** Can check native app connection status (extension only) */
  hasNativeConnection: boolean
  /** Can detect browser type and open shortcuts page (extension only) */
  hasBrowserInfo: boolean
  /** Can sync settings across connected browsers (native only) */
  hasSync: boolean
  /** Which tab actions are supported */
  actions: ActionCapabilities
}

/**
 * Platform adapter interface - extends SettingsAdapter with platform-specific capabilities
 */
export interface PlatformAdapter<T extends CommonSettings = CommonSettings> extends SettingsAdapter<T> {
  /**
   * Platform capabilities - determines which features are available
   */
  capabilities: PlatformCapabilities

  // ─────────────────────────────────────────────────────────────────────────────
  // Tabs (extension, demo)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Subscribe to real-time tab updates
   * Returns an unsubscribe function
   */
  subscribeTabs?(callback: (tabs: Tab[]) => void): () => void

  // ─────────────────────────────────────────────────────────────────────────────
  // Native Connection (extension only)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Subscribe to native app connection status changes
   * Returns an unsubscribe function
   */
  subscribeNativeConnection?(callback: (isConnected: boolean) => void): () => void

  /**
   * Get the URL to download the native app
   */
  getNativeDownloadUrl?(): string

  // ─────────────────────────────────────────────────────────────────────────────
  // Browser Info (extension only)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get the current browser type
   */
  getBrowserType?(): BrowserType

  /**
   * Open the browser's keyboard shortcuts configuration page
   */
  openShortcutsPage?(): void

  // ─────────────────────────────────────────────────────────────────────────────
  // Settings Sync (native only)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get current sync status across connected browsers
   */
  getSyncStatus?(): Promise<SyncStatus>

  /**
   * Sync settings to all connected browsers
   */
  syncSettings?(): Promise<void>

  /**
   * Subscribe to sync status changes
   * Returns an unsubscribe function
   */
  subscribeSyncStatus?(callback: (status: SyncStatus) => void): () => void

  // ─────────────────────────────────────────────────────────────────────────────
  // Tab Actions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Activate a tab and bring its window to front
   */
  activateTab?(tabId: string): Promise<ActionResult>

  /**
   * Close a tab
   */
  closeTab?(tabId: string): Promise<ActionResult>

  /**
   * Force refresh the tab list
   */
  refreshTabs?(): Promise<ActionResult>

  /**
   * Move a tab to a new position, optionally in a different window
   */
  reorderTabs?(tabId: string, newIndex: number, targetWindowId?: number): Promise<ActionResult>

  /**
   * Create a new browser window with the given URLs
   */
  createWindowWithTabs?(urls: string[]): Promise<ActionResult>
}

/**
 * Platform context value provided to consumers
 * Extends settings context with platform-specific data
 */
export interface PlatformContextValue<T extends CommonSettings = CommonSettings> {
  // ─────────────────────────────────────────────────────────────────────────────
  // Settings (from SettingsAdapter)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Current settings (null while loading) */
  settings: T | null
  /** Whether settings are currently loading */
  isLoading: boolean
  /** Error if settings failed to load */
  error: Error | null
  /** Update a single setting */
  updateSetting: <K extends keyof T>(key: K, value: T[K]) => Promise<void>
  /** Application version (if available) */
  version?: string

  // ─────────────────────────────────────────────────────────────────────────────
  // Platform capabilities
  // ─────────────────────────────────────────────────────────────────────────────

  /** Platform capabilities */
  capabilities: PlatformCapabilities

  // ─────────────────────────────────────────────────────────────────────────────
  // Tabs
  // ─────────────────────────────────────────────────────────────────────────────

  /** Current tabs (empty if not supported) */
  tabs: Tab[]
  /** Whether tabs are loading */
  tabsLoading: boolean

  // ─────────────────────────────────────────────────────────────────────────────
  // Native Connection
  // ─────────────────────────────────────────────────────────────────────────────

  /** Whether native app is connected */
  nativeConnected: boolean
  /** URL to download native app */
  nativeDownloadUrl: string

  // ─────────────────────────────────────────────────────────────────────────────
  // Browser Info
  // ─────────────────────────────────────────────────────────────────────────────

  /** Current browser type */
  browserType: BrowserType
  /** Open browser shortcuts page */
  openShortcutsPage: () => void

  // ─────────────────────────────────────────────────────────────────────────────
  // Settings Sync
  // ─────────────────────────────────────────────────────────────────────────────

  /** Current sync status */
  syncStatus: SyncStatus | null
  /** Whether sync is in progress */
  isSyncing: boolean
  /** Trigger a sync */
  sync: () => Promise<void>

  // ─────────────────────────────────────────────────────────────────────────────
  // Tab Actions
  // ─────────────────────────────────────────────────────────────────────────────

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
}

/**
 * Default capabilities - all disabled
 */
export const DEFAULT_CAPABILITIES: PlatformCapabilities = {
  hasTabs: false,
  hasNativeConnection: false,
  hasBrowserInfo: false,
  hasSync: false,
  actions: DEFAULT_ACTION_CAPABILITIES,
}

/**
 * Default native download URL
 */
export const DEFAULT_NATIVE_DOWNLOAD_URL = "https://github.com/mckinley/tab-app-switcher/releases/latest"
