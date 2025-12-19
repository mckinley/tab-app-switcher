/**
 * Shared theme utilities for TAS
 * Used by both extension and native implementations
 */

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
