/**
 * Tab Storage Module
 *
 * Persists tab data to disk for instant startup display.
 * Uses electron-store for reliable cross-platform persistence.
 */

import Store from 'electron-store'
import type { Tab } from '@tas/types/tabs'

interface TabStorageSchema {
  // Display-ready tabs for instant startup
  displayTabs: Tab[]
  // Last saved timestamp
  lastSaved: number
}

// Create store with schema
const store = new Store<TabStorageSchema>({
  name: 'tab-cache-v2', // New name to avoid conflicts with old format
  defaults: {
    displayTabs: [],
    lastSaved: 0
  }
})

/**
 * Load persisted tab data from disk
 */
export function loadTabData(): {
  displayTabs: Tab[]
} {
  const displayTabs = store.get('displayTabs', [])

  console.log('[TAS Storage] Loaded', displayTabs.length, 'tabs from disk')

  return { displayTabs }
}

/**
 * Save tab data to disk
 * Debounced to avoid excessive writes: the list only needs to be close enough to show
 * something right after launch, before the browsers reconnect. Call flushTabData on quit.
 */
let saveTimeout: NodeJS.Timeout | null = null
let pendingTabs: Tab[] | null = null
let lastSavedCount = -1
const SAVE_DEBOUNCE_MS = 30_000

export function saveTabData(displayTabs: Tab[]): void {
  pendingTabs = displayTabs
  if (!saveTimeout) saveTimeout = setTimeout(flushTabData, SAVE_DEBOUNCE_MS)
}

/** Write any pending tab list now */
export function flushTabData(): void {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = null
  if (!pendingTabs) return

  // Only open tabs, and without favicon images (data URLs make the file large); Recently
  // Closed and Other Devices are browsing history the app doesn't need to keep.
  const displayTabs = pendingTabs
    .filter((tab) => !tab.sessionId)
    .map((tab) => (tab.favicon.startsWith('data:') ? { ...tab, favicon: '' } : tab))
  pendingTabs = null
  store.set({ displayTabs, lastSaved: Date.now() })

  // Only log if tab count changed to reduce noise
  if (displayTabs.length !== lastSavedCount) {
    console.log('[TAS Storage] Saved', displayTabs.length, 'tabs to disk')
    lastSavedCount = displayTabs.length
  }
}

/**
 * Clear all persisted tab data
 */
export function clearTabData(): void {
  store.clear()
  console.log('[TAS Storage] Cleared all tab data from disk')
}

/**
 * Get the last saved timestamp
 */
export function getLastSavedTimestamp(): number {
  return store.get('lastSaved', 0)
}
