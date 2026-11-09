import { useSyncExternalStore } from "react"
import { detectPlatform, type PlatformInfo } from "./detectPlatform"

/*
 * The public pages (home, About, Downloads) are rendered to HTML at build time, so search engines
 * get their text, and then hydrated in the browser. The first render in the browser has to match
 * that HTML, so anything that depends on the browser (the address, the platform, localStorage)
 * waits until after hydration. These hooks give the build's value until then, and React renders
 * again with the browser's value right after.
 */

const noSubscribe = () => () => {}

/** False when the page is built and while it hydrates, true after that */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  )
}

/** The page's path, or "" when the page is built and while it hydrates */
export function usePathname(): string {
  return useSyncExternalStore(
    noSubscribe,
    () => window.location.pathname,
    () => "",
  )
}

const UNKNOWN_PLATFORM: PlatformInfo = { os: "unknown", browser: "unknown" }
let detectedPlatform: PlatformInfo | undefined

/** The visitor's OS and browser, or unknown when the page is built and while it hydrates */
export function usePlatform(): PlatformInfo {
  return useSyncExternalStore(
    noSubscribe,
    () => (detectedPlatform ??= detectPlatform()),
    () => UNKNOWN_PLATFORM,
  )
}
