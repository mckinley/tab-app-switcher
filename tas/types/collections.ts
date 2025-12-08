/**
 * Collection types for Tab Application Switcher
 * Collections store full tab snapshots for cross-device sync
 */

/**
 * A snapshot of a tab's data at the time it was added to a collection
 * This is independent of the browser's current tab state
 */
export interface CollectionTab {
  url: string
  title: string
  favicon: string
}

/**
 * A collection of saved tabs
 * Stores full tab data for offline-first sync across devices
 */
export interface Collection {
  id: string
  name: string
  tabs: CollectionTab[]
  updatedAt: number // Unix timestamp for last-write-wins sync
}

/**
 * Legacy collection format (tabIds only)
 * Used for migration from old localStorage format
 */
export interface LegacyCollection {
  id: string
  name: string
  tabIds: string[]
}

/**
 * Check if a collection is in the legacy format
 */
export function isLegacyCollection(collection: Collection | LegacyCollection): collection is LegacyCollection {
  return "tabIds" in collection && !("tabs" in collection)
}
