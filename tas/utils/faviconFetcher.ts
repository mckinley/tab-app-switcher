/**
 * Favicon fetching utilities for manually added URLs
 * Uses Google Favicon API to fetch favicons and converts to data URLs
 */

export const FALLBACK_FAVICON =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="%23999"/><path d="M4 2.5 L4.4 3.6 L5.6 3.6 L4.6 4.3 L5 5.5 L4 4.7 L3 5.5 L3.4 4.3 L2.4 3.6 L3.6 3.6 Z" fill="%23fff"/></svg>'

export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return null
  }
}

export function getGoogleFaviconUrl(domain: string, size = 32): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function fetchFaviconAsDataUrl(url: string): Promise<string> {
  const domain = extractDomain(url)
  if (!domain) return FALLBACK_FAVICON

  const faviconUrl = getGoogleFaviconUrl(domain)

  try {
    const response = await fetch(faviconUrl)
    if (!response.ok) return FALLBACK_FAVICON
    const blob = await response.blob()
    return await blobToDataUrl(blob)
  } catch {
    return FALLBACK_FAVICON
  }
}

export function generateTitleFromUrl(url: string): string {
  const domain = extractDomain(url)
  if (!domain) return url
  const cleaned = domain.replace(/^www\./, "")
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return "https://" + trimmed
  }
  return trimmed
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url.startsWith("http") ? url : "https://" + url)
    return true
  } catch {
    return false
  }
}
