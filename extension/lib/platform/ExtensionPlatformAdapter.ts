/**
 * Extension Platform Adapter
 *
 * Implements PlatformAdapter for browser extensions.
 * Extends ExtensionSettingsAdapter with tabs, native connection, and browser info.
 */

import type { PlatformAdapter, PlatformCapabilities, ActionResult, ActionCapabilities } from "@tas/lib/platform"
import type { ExtensionSettings } from "@tas/lib/settings"
import type { Tab, BrowserType } from "@tas/types/tabs"
import { DEFAULT_KEYBOARD_SETTINGS } from "@tas/types/tabs"
import { applyTheme, loadAndApplyTheme } from "../../utils/theme"

// Native app download URL
const NATIVE_APP_URL = "https://github.com/mckinley/tab-app-switcher/releases/latest"

// Storage keys
const STORAGE_KEYS = {
  theme: "theme",
  keyboard: "keyboard",
  sortOrder: "sortOrder",
} as const

/**
 * Detect browser type from user agent
 */
function detectBrowser(): BrowserType {
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes("edg/")) return "edge"
  if (userAgent.includes("firefox")) return "firefox"
  if (userAgent.includes("safari") && !userAgent.includes("chrome")) return "safari"
  if (userAgent.includes("chrome")) return "chrome"
  return "unknown"
}

export class ExtensionPlatformAdapter implements PlatformAdapter<ExtensionSettings> {
  private browserType: BrowserType

  constructor() {
    this.browserType = detectBrowser()
  }

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
    canCreateWindow: false,
  }

  capabilities: PlatformCapabilities = {
    hasTabs: true,
    hasNativeConnection: true,
    hasBrowserInfo: true,
    hasSync: false,
    actions: this.actionCapabilities,
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Settings (from SettingsAdapter)
  // ─────────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────────
  // Tabs
  // ─────────────────────────────────────────────────────────────────────────────

  subscribeTabs(callback: (tabs: Tab[]) => void): () => void {
    const port = browser.runtime.connect({ name: "sort-preview" })

    const messageListener = (message: { type: string; tabs?: Tab[] }): void => {
      if (message.type === "TABS_UPDATED" && message.tabs) {
        callback(message.tabs)
      }
    }

    port.onMessage.addListener(messageListener)

    return () => {
      port.disconnect()
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Native Connection
  // ─────────────────────────────────────────────────────────────────────────────

  subscribeNativeConnection(callback: (isConnected: boolean) => void): () => void {
    let intervalId: ReturnType<typeof setInterval> | null = null

    const checkNativeApp = (): void => {
      browser.runtime
        .sendMessage({ type: "CHECK_NATIVE_APP" })
        .then((response) => {
          callback(response?.connected || false)
        })
        .catch(() => {
          callback(false)
        })
    }

    // Initial check
    checkNativeApp()

    // Poll every 5 seconds
    intervalId = setInterval(checkNativeApp, 5000)

    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
      }
    }
  }

  getNativeDownloadUrl(): string {
    return NATIVE_APP_URL
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Browser Info
  // ─────────────────────────────────────────────────────────────────────────────

  getBrowserType(): BrowserType {
    return this.browserType
  }

  openShortcutsPage(): void {
    if (this.browserType === "edge") {
      browser.tabs.create({ url: "edge://extensions/shortcuts" })
    } else {
      browser.tabs.create({ url: "chrome://extensions/shortcuts" })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tab Actions
  // ─────────────────────────────────────────────────────────────────────────────

  async activateTab(tabId: string): Promise<ActionResult> {
    try {
      await browser.runtime.sendMessage({ type: "ACTIVATE_TAB", tabId })
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async closeTab(tabId: string): Promise<ActionResult> {
    try {
      await browser.runtime.sendMessage({ type: "CLOSE_TAB", tabId })
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async refreshTabs(): Promise<ActionResult> {
    try {
      await browser.runtime.sendMessage({ type: "REFRESH_TABS" })
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async reorderTabs(_tabId: string, _newIndex: number, _targetWindowId?: number): Promise<ActionResult> {
    return { success: false, error: "Not supported in this context" }
  }

  async createWindowWithTabs(_urls: string[]): Promise<ActionResult> {
    return { success: false, error: "Not supported in this context" }
  }
}

/**
 * Singleton instance of the extension platform adapter
 */
export const extensionPlatformAdapter = new ExtensionPlatformAdapter()
