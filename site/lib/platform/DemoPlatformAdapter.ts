/**
 * Demo Platform Adapter
 *
 * Implements PlatformAdapter for the demo site using in-memory storage.
 * Provides mock tabs for demonstration purposes.
 */

import type { PlatformAdapter, PlatformCapabilities } from "@tas/lib/platform"
import type { DemoSettings } from "@tas/lib/settings"
import type { Tab } from "@tas/types/tabs"
import { DEFAULT_KEYBOARD_SETTINGS } from "@tas/types/tabs"
import { applyThemeToDocument, resolveTheme, getSystemPrefersDark, type Theme } from "@tas/lib/theme"

const DEMO_VERSION = "1.2.0 (Demo)"

// Mock tabs for demonstration
const MOCK_TABS: Tab[] = [
  {
    id: "1",
    title: "GitHub - Tab App Switcher",
    url: "https://github.com/mckinley/tab-app-switcher",
    favicon: "https://github.githubassets.com/favicons/favicon.svg",
    lastActivated: Date.now() - 1000,
  },
  {
    id: "2",
    title: "React Documentation",
    url: "https://react.dev",
    favicon: "https://react.dev/favicon.ico",
    lastActivated: Date.now() - 5000,
  },
  {
    id: "3",
    title: "TypeScript Handbook",
    url: "https://www.typescriptlang.org/docs/handbook/",
    favicon: "https://www.typescriptlang.org/favicon.ico",
    lastActivated: Date.now() - 10000,
  },
  {
    id: "4",
    title: "MDN Web Docs",
    url: "https://developer.mozilla.org",
    favicon: "https://developer.mozilla.org/favicon.ico",
    lastActivated: Date.now() - 20000,
  },
  {
    id: "5",
    title: "Stack Overflow",
    url: "https://stackoverflow.com",
    favicon: "https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico",
    lastActivated: Date.now() - 30000,
  },
]

export class DemoPlatformAdapter implements PlatformAdapter<DemoSettings> {
  private settings: DemoSettings = {
    theme: "system",
    sortOrder: "activated",
    keyboard: DEFAULT_KEYBOARD_SETTINGS,
  }

  private listeners = new Set<(settings: Partial<DemoSettings>) => void>()

  // ─────────────────────────────────────────────────────────────────────────────
  // Platform Capabilities
  // ─────────────────────────────────────────────────────────────────────────────

  capabilities: PlatformCapabilities = {
    hasTabs: true,
    hasNativeConnection: false,
    hasBrowserInfo: false,
    hasSync: false,
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Settings (from SettingsAdapter)
  // ─────────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────────
  // Tabs
  // ─────────────────────────────────────────────────────────────────────────────

  subscribeTabs(callback: (tabs: Tab[]) => void): () => void {
    // Send mock tabs immediately
    callback([...MOCK_TABS])

    // No ongoing updates in demo mode
    return () => {}
  }
}

/**
 * Singleton instance of the demo platform adapter
 */
export const demoPlatformAdapter = new DemoPlatformAdapter()
