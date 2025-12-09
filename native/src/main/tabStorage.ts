import Store from 'electron-store'
import type { BrowserType } from '@tas/types/tabs'

interface CachedTab {
  id: string
  title: string
  url: string
  favicon: string
  windowId?: number
  index?: number
  browser?: BrowserType
  lastAccessed?: number
  lastActivated?: number
  lastDeactivated?: number
  lastActiveTime?: number
}

interface TabStorageSchema {
  globalMruTabs: CachedTab[]
  browserTabCaches: Record<BrowserType, CachedTab[]>
  lastSaved: number
}

// Create store with schema
const store = new Store<TabStorageSchema>({
  name: 'tab-cache',
  defaults: {
    globalMruTabs: [],
    browserTabCaches: {} as Record<BrowserType, CachedTab[]>,
    lastSaved: 0
  }
})

/**
 * Load persisted tab data from disk
 */
export function loadTabData(): {
  globalMruTabs: CachedTab[]
  browserTabCaches: Map<BrowserType, CachedTab[]>
} {
  const data = store.store
  const browserTabCaches = new Map<BrowserType, CachedTab[]>()

  // Convert stored object back to Map
  Object.entries(data.browserTabCaches || {}).forEach(([browser, tabs]) => {
    browserTabCaches.set(browser as BrowserType, tabs)
  })

  console.log(
    'Loaded tab data from disk:',
    data.globalMruTabs.length,
    'global tabs,',
    browserTabCaches.size,
    'browsers'
  )

  return {
    globalMruTabs: data.globalMruTabs || [],
    browserTabCaches
  }
}

/**
 * Save tab data to disk
 * Debounced to avoid excessive writes
 */
let saveTimeout: NodeJS.Timeout | null = null
const SAVE_DEBOUNCE_MS = 1000

export function saveTabData(
  globalMruTabs: CachedTab[],
  browserTabCaches: Map<BrowserType, CachedTab[]>
): void {
  if (saveTimeout) clearTimeout(saveTimeout)

  saveTimeout = setTimeout(() => {
    // Convert Map to plain object for storage
    const browserTabCachesObj: Record<BrowserType, CachedTab[]> = {} as Record<
      BrowserType,
      CachedTab[]
    >
    browserTabCaches.forEach((tabs, browser) => {
      browserTabCachesObj[browser] = tabs
    })

    store.set({
      globalMruTabs,
      browserTabCaches: browserTabCachesObj,
      lastSaved: Date.now()
    })

    console.log(
      'Saved tab data to disk:',
      globalMruTabs.length,
      'global tabs,',
      browserTabCaches.size,
      'browsers'
    )
  }, SAVE_DEBOUNCE_MS)
}

/**
 * Clear all persisted tab data
 */
export function clearTabData(): void {
  store.clear()
  console.log('Cleared all tab data from disk')
}

/**
 * Get the last saved timestamp
 */
export function getLastSavedTimestamp(): number {
  return store.get('lastSaved', 0)
}
