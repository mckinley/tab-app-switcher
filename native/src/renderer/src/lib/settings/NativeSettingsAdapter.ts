/**
 * Native Settings Adapter
 *
 * Implements SettingsAdapter for Electron native app using window.api.options
 */

import type { SettingsAdapter, NativeSettings } from '@tas/lib/settings'
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

export class NativeSettingsAdapter implements SettingsAdapter<NativeSettings> {
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
    // Return empty cleanup function
    return () => {}
  }

  async getVersion(): Promise<string> {
    if (!window.api?.about?.getAboutInfo) {
      return ''
    }
    const info = await window.api.about.getAboutInfo()
    return info.version
  }
}

/**
 * Singleton instance of the native settings adapter
 */
export const nativeSettingsAdapter = new NativeSettingsAdapter()
