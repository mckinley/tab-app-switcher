/**
 * Shared theme utilities for TAS
 * Used by both extension and native implementations
 */

import { useEffect } from "react"

export type Theme = "light" | "dark" | "system"

/**
 * Resolve a theme setting to an actual light/dark value
 * @param theme - The theme setting
 * @param systemPrefersDark - Whether the system prefers dark mode
 */
export function resolveTheme(theme: Theme, systemPrefersDark: boolean): "light" | "dark" {
  if (theme === "system") {
    return systemPrefersDark ? "dark" : "light"
  }
  return theme
}

/**
 * Apply a resolved theme to the document
 * @param resolvedTheme - The resolved theme (light or dark)
 */
export function applyThemeToDocument(resolvedTheme: "light" | "dark"): void {
  if (resolvedTheme === "dark") {
    document.documentElement.classList.add("dark")
  } else {
    document.documentElement.classList.remove("dark")
  }
}

/**
 * Get whether the system prefers dark mode
 */
export function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

/**
 * Standalone hook that applies system theme preference.
 * Use this for windows without a PlatformProvider (e.g., about window).
 * For windows with a provider, use useApplyTheme() from hooks.ts instead.
 */
export function useSystemTheme(): void {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const applySystemTheme = (): void => {
      applyThemeToDocument(mediaQuery.matches ? "dark" : "light")
    }

    // Apply immediately
    applySystemTheme()

    // Listen for changes
    mediaQuery.addEventListener("change", applySystemTheme)
    return () => mediaQuery.removeEventListener("change", applySystemTheme)
  }, [])
}
