/**
 * Collections storage service
 * Handles localStorage persistence and migration from legacy format
 */

import type { Collection, LegacyCollection, CollectionTab } from "../types/collections"
import { isLegacyCollection } from "../types/collections"
import type { Tab } from "../types/tabs"

const STORAGE_KEY = "tab-collections"

/**
 * Load collections from localStorage
 * Handles migration from legacy format if needed
 */
export function loadCollections(currentTabs: Tab[]): Collection[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return []

  try {
    const parsed = JSON.parse(saved) as (Collection | LegacyCollection)[]

    // Check if migration is needed
    const needsMigration = parsed.some(isLegacyCollection)

    if (needsMigration) {
      const migrated = migrateCollections(parsed, currentTabs)
      // Save migrated format back to localStorage
      saveCollections(migrated)
      return migrated
    }

    return parsed as Collection[]
  } catch {
    console.error("Failed to parse collections from localStorage")
    return []
  }
}

/**
 * Save collections to localStorage
 */
export function saveCollections(collections: Collection[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collections))
}

/**
 * Migrate legacy collections (tabIds) to new format (full tab data)
 */
function migrateCollections(collections: (Collection | LegacyCollection)[], currentTabs: Tab[]): Collection[] {
  const tabsById = new Map(currentTabs.map((tab) => [tab.id, tab]))

  return collections.map((collection): Collection => {
    if (!isLegacyCollection(collection)) {
      return collection
    }

    // Convert tabIds to full tab data
    const tabs: CollectionTab[] = collection.tabIds
      .map((tabId) => {
        const tab = tabsById.get(tabId)
        if (!tab) return null
        return {
          url: tab.url,
          title: tab.title,
          favicon: tab.favicon,
        }
      })
      .filter((tab): tab is CollectionTab => tab !== null)

    return {
      id: collection.id,
      name: collection.name,
      tabs,
      updatedAt: Date.now(),
    }
  })
}

/**
 * Create a new collection
 */
export function createCollection(name: string): Collection {
  return {
    id: crypto.randomUUID(),
    name,
    tabs: [],
    updatedAt: Date.now(),
  }
}

/**
 * Add a tab to a collection
 */
export function addTabToCollection(collection: Collection, tab: Tab): Collection {
  // Check if tab already exists in collection by URL
  const exists = collection.tabs.some((t) => t.url === tab.url)
  if (exists) return collection

  return {
    ...collection,
    tabs: [
      ...collection.tabs,
      {
        url: tab.url,
        title: tab.title,
        favicon: tab.favicon,
      },
    ],
    updatedAt: Date.now(),
  }
}

/**
 * Remove a tab from a collection by URL
 */
export function removeTabFromCollection(collection: Collection, url: string): Collection {
  return {
    ...collection,
    tabs: collection.tabs.filter((t) => t.url !== url),
    updatedAt: Date.now(),
  }
}

/**
 * Rename a collection
 */
export function renameCollection(collection: Collection, newName: string): Collection {
  return {
    ...collection,
    name: newName,
    updatedAt: Date.now(),
  }
}
