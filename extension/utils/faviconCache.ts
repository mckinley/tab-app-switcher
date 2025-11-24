/**
 * Favicon caching utility for converting Chrome favicon URLs to data URLs
 * This allows favicons to be sent to the native app without CORS issues
 */

// Fallback favicon as data URL (grey circle with star)
const FALLBACK_FAVICON =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="%23999"/><path d="M4 2.5 L4.4 3.6 L5.6 3.6 L4.6 4.3 L5 5.5 L4 4.7 L3 5.5 L3.4 4.3 L2.4 3.6 L3.6 3.6 Z" fill="%23fff"/></svg>'

// Cache to store favicon data URLs
// Key: original favicon URL, Value: data URL
const faviconCache = new Map<string, string>()

// Track in-flight requests to avoid duplicate fetches
const pendingFetches = new Map<string, Promise<string>>()

/**
 * Convert a blob to a data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Fetch a favicon and convert it to a data URL
 * Simple approach: fetch the URL and convert blob to data URL
 */
async function fetchFaviconDataUrl(faviconUrl: string): Promise<string> {
  // Return fallback for empty URLs or data URLs
  if (!faviconUrl || faviconUrl.startsWith("data:")) {
    return faviconUrl || FALLBACK_FAVICON
  }

  try {
    const response = await fetch(faviconUrl)

    if (!response.ok) {
      // Don't log 404s for localhost dev server
      if (!faviconUrl.includes("localhost")) {
        console.log(`[TAS] Failed to fetch favicon: ${faviconUrl}`, response.status)
      }
      return FALLBACK_FAVICON
    }

    const blob = await response.blob()

    // Convert blob to data URL
    const dataUrl = await blobToDataUrl(blob)
    return dataUrl
  } catch (error) {
    // CORS errors are expected for many favicons - fail silently
    // Don't log errors for localhost or CORS issues
    if (!faviconUrl.includes("localhost") && !String(error).includes("CORS")) {
      console.log(`[TAS] Failed to cache favicon: ${faviconUrl}`, error)
    }
    return FALLBACK_FAVICON
  }
}

/**
 * Get a favicon as a data URL, using cache if available
 * If not cached, fetches and caches it
 */
export async function getFaviconDataUrl(faviconUrl: string): Promise<string> {
  // Return fallback for empty URLs
  if (!faviconUrl) {
    return FALLBACK_FAVICON
  }

  // Check cache first
  const cached = faviconCache.get(faviconUrl)
  if (cached) {
    return cached
  }

  // Check if already fetching
  const pending = pendingFetches.get(faviconUrl)
  if (pending) {
    return pending
  }

  // Fetch and cache
  const fetchPromise = fetchFaviconDataUrl(faviconUrl).then((dataUrl) => {
    faviconCache.set(faviconUrl, dataUrl)
    pendingFetches.delete(faviconUrl)
    return dataUrl
  })

  pendingFetches.set(faviconUrl, fetchPromise)
  return fetchPromise
}

/**
 * Preload favicons for multiple URLs
 * Useful for batch loading when tabs are updated
 */
export async function preloadFavicons(faviconUrls: string[]): Promise<void> {
  const uniqueUrls = [...new Set(faviconUrls)].filter((url) => url && !faviconCache.has(url))

  if (uniqueUrls.length === 0) {
    return
  }

  // Fetch all favicons in parallel
  await Promise.all(uniqueUrls.map((url) => getFaviconDataUrl(url)))
}

/**
 * Clear the favicon cache
 * Useful for testing or memory management
 */
export function clearFaviconCache(): void {
  faviconCache.clear()
  pendingFetches.clear()
}

/**
 * Get cache statistics
 * Useful for debugging
 */
export function getFaviconCacheStats(): { size: number; pending: number } {
  return {
    size: faviconCache.size,
    pending: pendingFetches.size,
  }
}

