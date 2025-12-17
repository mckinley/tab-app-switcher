/**
 * Tab Sorting Module
 *
 * Provides the main interface for sorting tabs using different strategies.
 * Both the extension and native app use this module for consistent sorting.
 */

export type { SortStrategy } from "./strategies"
export {
  applySortStrategy,
  sortByLastActivated,
  sortByWindowGrouped,
  sortByLastAccessed,
  sortByLastDeactivated,
  getTabTimestamp,
} from "./strategies"

import type { BrowserTab, BrowserWindow, TabAugmentation, SessionTab, DeviceSession } from "../types/protocol"
import type { Tab, TabSection } from "../types/tabs"
import { applySortStrategy, type SortStrategy } from "./strategies"

/**
 * Transform a BrowserTab + TabAugmentation into a display-ready Tab
 */
export function transformTab(
  browserTab: BrowserTab,
  augmentation?: TabAugmentation,
  section: TabSection = "tabs",
): Tab {
  const tabId = String(browserTab.id ?? 0)

  return {
    id: tabId,
    title: browserTab.title ?? "Untitled",
    url: browserTab.url ?? "",
    favicon: augmentation?.faviconDataUrl ?? browserTab.favIconUrl ?? "",
    windowId: browserTab.windowId,
    index: browserTab.index,
    section,
    // Timing fields
    lastAccessed: browserTab.lastAccessed,
    lastActivated: augmentation?.lastActivated,
    lastDeactivated: augmentation?.lastDeactivated,
  }
}

/**
 * Transform a SessionTab (recently closed or from another device) into a display-ready Tab
 */
export function transformSessionTab(sessionTab: SessionTab, section: TabSection, deviceName?: string): Tab {
  return {
    id: `session:${sessionTab.sessionId}`,
    title: sessionTab.title,
    url: sessionTab.url,
    favicon: sessionTab.favIconUrl ?? "",
    section,
    sessionId: sessionTab.sessionId,
    deviceName,
    // lastModified is in seconds, convert to milliseconds
    lastAccessed: sessionTab.lastModified * 1000,
  }
}

export interface SortTabsOptions {
  sessionTabs: BrowserTab[]
  sessionWindows?: BrowserWindow[]
  augmentation: Record<string, TabAugmentation>
  recentlyClosed?: SessionTab[]
  otherDevices?: DeviceSession[]
  strategy?: SortStrategy
}

/**
 * Sort tabs and transform them into display-ready Tab objects with sections
 *
 * @param options - Sorting options including tabs, windows, augmentation, and session data
 * @returns Sorted array of display-ready Tab objects with section assignments
 */
export function sortTabsWithSections(options: SortTabsOptions): Tab[] {
  const {
    sessionTabs,
    sessionWindows = [],
    augmentation,
    recentlyClosed = [],
    otherDevices = [],
    strategy = "lastActivated",
  } = options

  // Build a set of app window IDs
  const appWindowIds = new Set<number>()
  sessionWindows.forEach((win) => {
    if (win.id !== undefined && win.type === "app") {
      appWindowIds.add(win.id)
    }
  })

  // Separate regular tabs from app tabs
  const regularTabs: BrowserTab[] = []
  const appTabs: BrowserTab[] = []

  sessionTabs.forEach((tab) => {
    if (tab.windowId !== undefined && appWindowIds.has(tab.windowId)) {
      appTabs.push(tab)
    } else {
      regularTabs.push(tab)
    }
  })

  // Sort regular tabs
  const sortedRegularTabs = applySortStrategy(strategy, regularTabs, augmentation)
  const regularDisplayTabs = sortedRegularTabs.map((browserTab) => {
    const tabId = String(browserTab.id)
    return transformTab(browserTab, augmentation[tabId], "tabs")
  })

  // Sort app tabs (by lastActivated)
  const sortedAppTabs = applySortStrategy("lastActivated", appTabs, augmentation)
  const appDisplayTabs = sortedAppTabs.map((browserTab) => {
    const tabId = String(browserTab.id)
    return transformTab(browserTab, augmentation[tabId], "apps")
  })

  // Transform recently closed tabs
  const recentlyClosedDisplayTabs = recentlyClosed.map((sessionTab) =>
    transformSessionTab(sessionTab, "recentlyClosed"),
  )

  // Transform other device tabs
  const otherDevicesDisplayTabs: Tab[] = []
  otherDevices.forEach((device) => {
    device.tabs.forEach((sessionTab) => {
      otherDevicesDisplayTabs.push(transformSessionTab(sessionTab, "otherDevices", device.deviceName))
    })
  })

  // Combine all sections: regular tabs first, then apps, then recently closed, then other devices
  return [...regularDisplayTabs, ...appDisplayTabs, ...recentlyClosedDisplayTabs, ...otherDevicesDisplayTabs]
}

/**
 * Sort tabs and transform them into display-ready Tab objects (legacy function without sections)
 *
 * @param sessionTabs - Raw tabs from browser.tabs.query({})
 * @param augmentation - TAS-specific augmentation data keyed by tab ID
 * @param strategy - Sorting strategy to use
 * @returns Sorted array of display-ready Tab objects
 */
export function sortTabs(
  sessionTabs: BrowserTab[],
  augmentation: Record<string, TabAugmentation>,
  strategy: SortStrategy = "lastActivated",
): Tab[] {
  // Apply sorting strategy to get sorted BrowserTabs
  const sortedBrowserTabs = applySortStrategy(strategy, sessionTabs, augmentation)

  // Transform each BrowserTab into a display-ready Tab
  return sortedBrowserTabs.map((browserTab) => {
    const tabId = String(browserTab.id)
    return transformTab(browserTab, augmentation[tabId])
  })
}

/**
 * Get sorted tab IDs without transforming to Tab objects
 * Useful when you only need the ordering
 */
export function getSortedTabIds(
  sessionTabs: BrowserTab[],
  augmentation: Record<string, TabAugmentation>,
  strategy: SortStrategy = "lastActivated",
): number[] {
  const sortedBrowserTabs = applySortStrategy(strategy, sessionTabs, augmentation)
  return sortedBrowserTabs.map((tab) => tab.id).filter((id): id is number => id !== undefined)
}
