/**
 * Shared type definitions for Tab Application Switcher
 * Used by both the website demo and the browser extension
 */

export type BrowserType = "chrome" | "firefox" | "edge" | "safari" | "unknown"

export interface Tab {
  id: string
  title: string
  url: string
  favicon: string
  windowId?: number // Optional: browser window ID (extension only)
  index?: number // Optional: tab position within window (extension only)
  browser?: BrowserType // Optional: which browser this tab belongs to
  // Timing fields for comparison (all timestamps in milliseconds since epoch)
  lastAccessed?: number // Chrome's built-in lastAccessed from tabs API
  lastActivated?: number // When TAS detected this tab gained focus
  lastDeactivated?: number // When TAS detected this tab lost focus
  // Deprecated: use lastActivated instead
  lastActiveTime?: number
}

export interface KeyboardShortcuts {
  modifier: string
  activateForward: string
  activateBackward: string
  closeTab: string
  search: string
  tabManagement?: string
}

export const DEFAULT_SHORTCUTS: KeyboardShortcuts = {
  modifier: "Alt",
  activateForward: "Tab",
  activateBackward: "`",
  search: "F",
  closeTab: "W",
}
