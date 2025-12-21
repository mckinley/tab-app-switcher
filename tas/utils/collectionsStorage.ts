/**
 * Collections storage service
 * Handles localStorage persistence and migration from legacy format
 */

import type { Collection, LegacyCollection, CollectionTab } from "../types/collections"
import { isLegacyCollection } from "../types/collections"
import type { Tab } from "../types/tabs"
import { fetchFaviconAsDataUrl, generateTitleFromUrl, normalizeUrl } from "./faviconFetcher"

const STORAGE_KEY = "tab-collections"
const DELETED_IDS_KEY = "tab-collections-deleted"

export function generateCollectionTabId(): string {
  return crypto.randomUUID()
}

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

    // Migrate tabs without IDs or timestamps
    const collections = parsed as Collection[]
    const { collections: migratedWithIds, needsSave } = ensureTabIdsAndTimestamps(collections)
    if (needsSave) {
      saveCollections(migratedWithIds)
    }
    // Sort by updatedAt descending (most recently updated first)
    return migratedWithIds.sort((a, b) => b.updatedAt - a.updatedAt)
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
  const now = Date.now()

  return collections.map((collection): Collection => {
    if (!isLegacyCollection(collection)) {
      // Ensure existing tabs have IDs and timestamps
      return {
        ...collection,
        createdAt: collection.createdAt || collection.updatedAt || now,
        tabs: collection.tabs.map((tab) => ({
          ...tab,
          id: tab.id || generateCollectionTabId(),
          createdAt: tab.createdAt || now,
          updatedAt: tab.updatedAt || now,
        })),
      }
    }

    // Convert tabIds to full tab data
    const tabs: CollectionTab[] = collection.tabIds
      .map((tabId) => {
        const tab = tabsById.get(tabId)
        if (!tab) return null
        return {
          id: generateCollectionTabId(),
          url: tab.url,
          title: tab.title,
          favicon: tab.favicon,
          createdAt: now,
          updatedAt: now,
        }
      })
      .filter((tab): tab is CollectionTab => tab !== null)

    return {
      id: collection.id,
      name: collection.name,
      tabs,
      createdAt: now,
      updatedAt: now,
    }
  })
}

/**
 * Ensure all collection tabs have IDs and timestamps
 */
function ensureTabIdsAndTimestamps(collections: Collection[]): { collections: Collection[]; needsSave: boolean } {
  let needsSave = false
  const now = Date.now()

  const migrated = collections.map((collection) => {
    const collectionNeedsUpdate = !collection.createdAt
    const tabsNeedUpdate = collection.tabs.some((tab) => !tab.id || !tab.createdAt || !tab.updatedAt)

    if (!collectionNeedsUpdate && !tabsNeedUpdate) return collection

    needsSave = true
    return {
      ...collection,
      createdAt: collection.createdAt || collection.updatedAt || now,
      tabs: collection.tabs.map((tab) => ({
        ...tab,
        id: tab.id || generateCollectionTabId(),
        createdAt: tab.createdAt || now,
        updatedAt: tab.updatedAt || now,
      })),
    }
  })

  return { collections: migrated, needsSave }
}

/**
 * Create a new collection
 */
export function createCollection(name: string): Collection {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name,
    tabs: [],
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Add a tab to a collection
 */
export function addTabToCollection(collection: Collection, tab: Tab): Collection {
  // Check if tab already exists in collection by URL
  const exists = collection.tabs.some((t) => t.url === tab.url)
  if (exists) return collection

  const now = Date.now()
  return {
    ...collection,
    tabs: [
      ...collection.tabs,
      {
        id: generateCollectionTabId(),
        url: tab.url,
        title: tab.title,
        favicon: tab.favicon,
        createdAt: now,
        updatedAt: now,
      },
    ],
    updatedAt: now,
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

/**
 * Remove a tab from a collection by its ID
 */
export function removeTabById(collection: Collection, tabId: string): Collection {
  return {
    ...collection,
    tabs: collection.tabs.filter((t) => t.id !== tabId),
    updatedAt: Date.now(),
  }
}

/**
 * Reorder tabs within a collection using dnd-kit's arrayMove for consistency
 */
export function reorderTabsInCollection(collection: Collection, fromIndex: number, toIndex: number): Collection {
  if (fromIndex === toIndex) return collection
  if (fromIndex < 0 || fromIndex >= collection.tabs.length) return collection
  if (toIndex < 0 || toIndex >= collection.tabs.length) return collection

  // Use same algorithm as dnd-kit's arrayMove
  const tabs = [...collection.tabs]
  const [item] = tabs.splice(fromIndex, 1)
  tabs.splice(toIndex, 0, item)

  return {
    ...collection,
    tabs,
    updatedAt: Date.now(),
  }
}

/**
 * Add a URL to a collection (fetches favicon automatically)
 */
export async function addUrlToCollection(collection: Collection, url: string, title?: string): Promise<Collection> {
  const normalizedUrl = normalizeUrl(url)

  // Check if URL already exists
  const exists = collection.tabs.some((t) => t.url === normalizedUrl)
  if (exists) return collection

  const favicon = await fetchFaviconAsDataUrl(normalizedUrl)
  const finalTitle = title?.trim() || generateTitleFromUrl(normalizedUrl)
  const now = Date.now()

  return {
    ...collection,
    tabs: [
      ...collection.tabs,
      {
        id: generateCollectionTabId(),
        url: normalizedUrl,
        title: finalTitle,
        favicon,
        createdAt: now,
        updatedAt: now,
      },
    ],
    updatedAt: now,
  }
}

/**
 * Update a tab in a collection (re-fetches favicon if URL changes)
 */
export async function updateTabInCollection(
  collection: Collection,
  tabId: string,
  updates: { url?: string; title?: string },
): Promise<Collection> {
  const tabIndex = collection.tabs.findIndex((t) => t.id === tabId)
  if (tabIndex === -1) return collection

  const existingTab = collection.tabs[tabIndex]
  let newUrl = existingTab.url
  let newFavicon = existingTab.favicon
  let newTitle = existingTab.title

  if (updates.url && updates.url !== existingTab.url) {
    newUrl = normalizeUrl(updates.url)
    newFavicon = await fetchFaviconAsDataUrl(newUrl)
    // If no title update provided and URL changed, regenerate title
    if (!updates.title) {
      newTitle = generateTitleFromUrl(newUrl)
    }
  }

  if (updates.title !== undefined) {
    newTitle = updates.title.trim() || generateTitleFromUrl(newUrl)
  }

  const now = Date.now()
  const tabs = [...collection.tabs]
  tabs[tabIndex] = {
    ...existingTab,
    url: newUrl,
    title: newTitle,
    favicon: newFavicon,
    updatedAt: now,
  }

  return {
    ...collection,
    tabs,
    updatedAt: now,
  }
}

/**
 * Track a collection as deleted (for sync purposes)
 * This ensures deleted collections don't return during merge
 */
export function trackDeletedCollection(collectionId: string): void {
  const deleted = getDeletedCollectionIds()
  if (!deleted.includes(collectionId)) {
    deleted.push(collectionId)
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(deleted))
  }
}

/**
 * Get list of deleted collection IDs
 */
export function getDeletedCollectionIds(): string[] {
  const saved = localStorage.getItem(DELETED_IDS_KEY)
  if (!saved) return []
  try {
    return JSON.parse(saved) as string[]
  } catch {
    return []
  }
}

/**
 * Remove a collection ID from the deleted list
 * (used when cloud deletion is confirmed)
 */
export function clearDeletedCollectionId(collectionId: string): void {
  const deleted = getDeletedCollectionIds()
  const filtered = deleted.filter((id) => id !== collectionId)
  localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(filtered))
}

/**
 * Clear all deleted collection IDs
 * (used after successful full sync)
 */
export function clearAllDeletedCollectionIds(): void {
  localStorage.removeItem(DELETED_IDS_KEY)
}
