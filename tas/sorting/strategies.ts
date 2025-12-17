/**
 * Sorting Strategies for Tab Application Switcher
 *
 * Each strategy takes sessionTabs and augmentation data and returns
 * tab IDs in sorted order. The actual Tab objects are constructed
 * by the sort executor using tabTransform.
 */

import type { BrowserTab, TabAugmentation } from "../types/protocol"

export type SortStrategy = "lastActivated" | "windowGrouped" | "lastAccessed" | "lastDeactivated"

/**
 * Get the effective timestamp for a tab (for sorting purposes)
 * Priority: lastActivated (TAS tracked) > lastAccessed (browser) > 0
 */
export function getTabTimestamp(tab: BrowserTab, augmentation?: TabAugmentation): number {
  return augmentation?.lastActivated ?? tab.lastAccessed ?? 0
}

/**
 * Sort by lastActivated timestamp (most recent first)
 * This is the default MRU (Most Recently Used) sorting
 */
export function sortByLastActivated(tabs: BrowserTab[], augmentation: Record<string, TabAugmentation>): BrowserTab[] {
  return [...tabs].sort((a, b) => {
    const aId = String(a.id)
    const bId = String(b.id)
    const aTime = getTabTimestamp(a, augmentation[aId])
    const bTime = getTabTimestamp(b, augmentation[bId])

    // Most recent first
    return bTime - aTime
  })
}

/**
 * Sort by window groups, with most recently active window first,
 * and tabs within each window sorted by lastActivated
 */
export function sortByWindowGrouped(tabs: BrowserTab[], augmentation: Record<string, TabAugmentation>): BrowserTab[] {
  // Group tabs by windowId
  const windowGroups = new Map<number, BrowserTab[]>()

  for (const tab of tabs) {
    const windowId = tab.windowId
    if (!windowGroups.has(windowId)) {
      windowGroups.set(windowId, [])
    }
    windowGroups.get(windowId)!.push(tab)
  }

  // Sort tabs within each window by lastActivated
  for (const [, windowTabs] of windowGroups) {
    windowTabs.sort((a, b) => {
      const aId = String(a.id)
      const bId = String(b.id)
      const aTime = getTabTimestamp(a, augmentation[aId])
      const bTime = getTabTimestamp(b, augmentation[bId])
      return bTime - aTime
    })
  }

  // Calculate the most recent timestamp for each window (for sorting windows)
  const windowMostRecent = new Map<number, number>()
  for (const [windowId, windowTabs] of windowGroups) {
    const mostRecentTab = windowTabs[0] // Already sorted, first is most recent
    if (mostRecentTab) {
      const tabId = String(mostRecentTab.id)
      windowMostRecent.set(windowId, getTabTimestamp(mostRecentTab, augmentation[tabId]))
    }
  }

  // Sort windows by their most recent tab
  const sortedWindowIds = Array.from(windowGroups.keys()).sort((a, b) => {
    const aTime = windowMostRecent.get(a) ?? 0
    const bTime = windowMostRecent.get(b) ?? 0
    return bTime - aTime
  })

  // Flatten: windows in order, tabs within each window in order
  const result: BrowserTab[] = []
  for (const windowId of sortedWindowIds) {
    const windowTabs = windowGroups.get(windowId)
    if (windowTabs) {
      result.push(...windowTabs)
    }
  }

  return result
}

/**
 * Sort by Chrome's lastAccessed timestamp (most recent first)
 * This uses the browser's native tracking rather than TAS tracking
 */
export function sortByLastAccessed(tabs: BrowserTab[], _augmentation: Record<string, TabAugmentation>): BrowserTab[] {
  return [...tabs].sort((a, b) => {
    const aTime = a.lastAccessed ?? 0
    const bTime = b.lastAccessed ?? 0
    return bTime - aTime
  })
}

/**
 * Sort by lastDeactivated timestamp (most recently deactivated first)
 * Shows tabs in order of when they lost focus
 */
export function sortByLastDeactivated(tabs: BrowserTab[], augmentation: Record<string, TabAugmentation>): BrowserTab[] {
  return [...tabs].sort((a, b) => {
    const aId = String(a.id)
    const bId = String(b.id)
    const aTime = augmentation[aId]?.lastDeactivated ?? 0
    const bTime = augmentation[bId]?.lastDeactivated ?? 0
    return bTime - aTime
  })
}

/**
 * Apply a sorting strategy to tabs
 */
export function applySortStrategy(
  strategy: SortStrategy,
  tabs: BrowserTab[],
  augmentation: Record<string, TabAugmentation>,
): BrowserTab[] {
  switch (strategy) {
    case "lastActivated":
      return sortByLastActivated(tabs, augmentation)
    case "windowGrouped":
      return sortByWindowGrouped(tabs, augmentation)
    case "lastAccessed":
      return sortByLastAccessed(tabs, augmentation)
    case "lastDeactivated":
      return sortByLastDeactivated(tabs, augmentation)
    default:
      // Default to lastActivated
      return sortByLastActivated(tabs, augmentation)
  }
}
