/**
 * Extension Settings Adapter
 *
 * Implements SettingsAdapter for browser extensions using browser.storage.local
 */

import type { SettingsAdapter, ExtensionSettings } from "@tas/lib/settings"
import { DEFAULT_KEYBOARD_SETTINGS } from "@tas/types/tabs"
import { applyTheme, loadAndApplyTheme } from "../../utils/theme"

const STORAGE_KEYS = {
  theme: "theme",
  keyboard: "keyboard",
  sortOrder: "sortOrder",
} as const

export class ExtensionSettingsAdapter implements SettingsAdapter<ExtensionSettings> {
  async load(): Promise<ExtensionSettings> {
    const result = await browser.storage.local.get([STORAGE_KEYS.theme, STORAGE_KEYS.keyboard, STORAGE_KEYS.sortOrder])

    // Apply theme on load
    await loadAndApplyTheme()

    return {
      theme: result[STORAGE_KEYS.theme] ?? "system",
      keyboard: result[STORAGE_KEYS.keyboard] ?? DEFAULT_KEYBOARD_SETTINGS,
      sortOrder: result[STORAGE_KEYS.sortOrder] ?? "activated",
    }
  }

  async save<K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]): Promise<void> {
    await browser.storage.local.set({ [key]: value })

    // Apply theme changes immediately
    if (key === "theme") {
      applyTheme(value as ExtensionSettings["theme"])
    }
  }

  subscribe(callback: (settings: Partial<ExtensionSettings>) => void): () => void {
    const listener = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, area: string): void => {
      if (area !== "local") return

      const updates: Partial<ExtensionSettings> = {}
      if (changes[STORAGE_KEYS.theme]) {
        updates.theme = changes[STORAGE_KEYS.theme].newValue as ExtensionSettings["theme"]
      }
      if (changes[STORAGE_KEYS.keyboard]) {
        updates.keyboard = changes[STORAGE_KEYS.keyboard].newValue as ExtensionSettings["keyboard"]
      }
      if (changes[STORAGE_KEYS.sortOrder]) {
        updates.sortOrder = changes[STORAGE_KEYS.sortOrder].newValue as ExtensionSettings["sortOrder"]
      }

      if (Object.keys(updates).length > 0) {
        callback(updates)
      }
    }

    browser.storage.onChanged.addListener(listener)
    return () => browser.storage.onChanged.removeListener(listener)
  }

  async getVersion(): Promise<string> {
    return browser.runtime.getManifest().version || ""
  }
}

/**
 * Singleton instance of the extension settings adapter
 */
export const extensionSettingsAdapter = new ExtensionSettingsAdapter()
