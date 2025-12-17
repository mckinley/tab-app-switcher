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

import type { BrowserTab, TabAugmentation } from "../types/protocol"
import type { Tab } from "../types/tabs"
import { applySortStrategy, type SortStrategy } from "./strategies"

/**
 * Transform a BrowserTab + TabAugmentation into a display-ready Tab
 */
export function transformTab(browserTab: BrowserTab, augmentation?: TabAugmentation): Tab {
  const tabId = String(browserTab.id ?? 0)

  return {
    id: tabId,
    title: browserTab.title ?? "Untitled",
    url: browserTab.url ?? "",
    favicon: augmentation?.faviconDataUrl ?? browserTab.favIconUrl ?? "",
    windowId: browserTab.windowId,
    index: browserTab.index,
    // Timing fields
    lastAccessed: browserTab.lastAccessed,
    lastActivated: augmentation?.lastActivated,
    lastDeactivated: augmentation?.lastDeactivated,
  }
}

/**
 * Sort tabs and transform them into display-ready Tab objects
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
