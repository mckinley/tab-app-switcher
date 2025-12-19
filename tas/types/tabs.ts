/**
 * Shared type definitions for Tab Application Switcher
 * Used by both the website demo and the browser extension
 */

export type BrowserType = "chrome" | "firefox" | "edge" | "safari" | "unknown"

export type TabSection = "tabs" | "apps" | "recentlyClosed" | "otherDevices"

export interface Tab {
  id: string
  title: string
  url: string
  favicon: string
  windowId?: number // Optional: browser window ID (extension only)
  index?: number // Optional: tab position within window (extension only)
  browser?: BrowserType // Optional: which browser this tab belongs to
  section?: TabSection // Which section this tab belongs to in the UI
  sessionId?: string // For recently closed/other device tabs - used to restore
  deviceName?: string // For other device tabs - which device it's from
  // Timing fields for comparison (all timestamps in milliseconds since epoch)
  lastAccessed?: number // Chrome's built-in lastAccessed from tabs API
  lastActivated?: number // When TAS detected this tab gained focus
  lastDeactivated?: number // When TAS detected this tab lost focus
}

export interface KeyboardSettings {
  modifier: string
  activateForward: string
  activateBackward: string
  closeTab: string
  search: string
  tabManagement?: string
}

export const DEFAULT_KEYBOARD_SETTINGS: KeyboardSettings = {
  modifier: "Alt",
  activateForward: "Tab",
  activateBackward: "`",
  search: "F",
  closeTab: "W",
}
