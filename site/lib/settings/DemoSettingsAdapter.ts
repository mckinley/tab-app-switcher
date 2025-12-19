/**
 * Demo Settings Adapter
 *
 * Implements SettingsAdapter for the demo site using in-memory storage
 */

import type { SettingsAdapter, DemoSettings } from "@tas/lib/settings"
import { DEFAULT_KEYBOARD_SETTINGS } from "@tas/types/tabs"
import { applyThemeToDocument, resolveTheme, getSystemPrefersDark, type Theme } from "@tas/lib/theme"

const DEMO_VERSION = "1.2.0 (Demo)"

export class DemoSettingsAdapter implements SettingsAdapter<DemoSettings> {
  private settings: DemoSettings = {
    theme: "system",
    sortOrder: "activated",
    keyboard: DEFAULT_KEYBOARD_SETTINGS,
  }

  private listeners = new Set<(settings: Partial<DemoSettings>) => void>()

  async load(): Promise<DemoSettings> {
    // Apply initial theme
    const resolved = resolveTheme(this.settings.theme, getSystemPrefersDark())
    applyThemeToDocument(resolved)

    return { ...this.settings }
  }

  async save<K extends keyof DemoSettings>(key: K, value: DemoSettings[K]): Promise<void> {
    this.settings[key] = value

    // Apply theme changes immediately
    if (key === "theme") {
      const resolved = resolveTheme(value as Theme, getSystemPrefersDark())
      applyThemeToDocument(resolved)
    }

    // Notify listeners
    this.listeners.forEach((listener) => listener({ [key]: value }))
  }

  subscribe(callback: (settings: Partial<DemoSettings>) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  async getVersion(): Promise<string> {
    return DEMO_VERSION
  }
}

/**
 * Singleton instance of the demo settings adapter
 */
export const demoSettingsAdapter = new DemoSettingsAdapter()
