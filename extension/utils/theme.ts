/**
 * Extension-specific theme utilities
 * Uses shared theme logic from tas and adds browser storage
 */
import { resolveTheme, applyThemeToDocument, getSystemPrefersDark, type Theme } from "@tas/lib/theme"

// Re-export Theme type for consumers
export type { Theme }

const THEME_STORAGE_KEY = "theme"

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined" || typeof window === "undefined") return

  const resolvedTheme = resolveTheme(theme, getSystemPrefersDark())
  applyThemeToDocument(resolvedTheme)
}

export async function getTheme(): Promise<Theme> {
  const result = await browser.storage.local.get(THEME_STORAGE_KEY)
  return (result[THEME_STORAGE_KEY] as Theme) ?? "system"
}

export async function saveTheme(theme: Theme): Promise<void> {
  await browser.storage.local.set({ [THEME_STORAGE_KEY]: theme })
}

export async function loadAndApplyTheme(): Promise<void> {
  const theme = await getTheme()
  applyTheme(theme)
}
