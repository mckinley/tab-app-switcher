/**
 * Settings Adapter Types
 *
 * Provides type definitions for the Settings Adapter pattern used across
 * extension, native, and demo environments.
 */

import type { Theme } from "../theme"
import type { SortOrder } from "../../sorting"
import type { KeyboardSettings } from "../../types/tabs"

/**
 * Common settings shared across all platforms
 */
export interface CommonSettings {
  theme: Theme
  sortOrder: SortOrder
}

/**
 * Extension-only settings (browser.storage.local)
 */
export interface ExtensionSettings extends CommonSettings {
  keyboard: KeyboardSettings
}

/**
 * Native app settings (electron-store via window.api.options)
 */
export interface NativeSettings extends CommonSettings {
  keyboard: KeyboardSettings
  launchOnLogin: boolean
  hideMenuBarIcon: boolean
  checkUpdatesAutomatically: boolean
}

/**
 * Demo/site settings (in-memory)
 */
export interface DemoSettings extends CommonSettings {
  keyboard: KeyboardSettings
}

/**
 * Settings adapter interface
 * Platform-specific implementations handle storage/API details
 */
export interface SettingsAdapter<T extends CommonSettings = CommonSettings> {
  /**
   * Load all settings from storage
   */
  load(): Promise<T>

  /**
   * Save a single setting to storage
   */
  save<K extends keyof T>(key: K, value: T[K]): Promise<void>

  /**
   * Subscribe to external settings changes (e.g., from another tab or main process)
   * Returns an unsubscribe function
   */
  subscribe?(callback: (settings: Partial<T>) => void): () => void

  /**
   * Get application version (optional)
   */
  getVersion?(): Promise<string>
}

/**
 * Settings context value provided to consumers
 */
export interface SettingsContextValue<T extends CommonSettings = CommonSettings> {
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
}
