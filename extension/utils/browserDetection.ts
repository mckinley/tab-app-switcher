/**
 * Browser Detection Utility
 *
 * Detects the browser type from the user agent string.
 */

import type { BrowserType } from "@tas/types/tabs"

/**
 * Detect the browser type from the user agent string
 */
export function detectBrowserType(): BrowserType {
  const userAgent = navigator.userAgent.toLowerCase()

  // Order matters: check more specific patterns first
  if (userAgent.includes("edg/")) return "edge"
  if (userAgent.includes("firefox")) return "firefox"
  if (userAgent.includes("safari") && !userAgent.includes("chrome")) return "safari"
  if (userAgent.includes("chrome")) return "chrome"

  return "unknown"
}

/**
 * Get the extension version from the manifest
 */
export function getExtensionVersion(): string {
  return browser.runtime.getManifest().version
}
