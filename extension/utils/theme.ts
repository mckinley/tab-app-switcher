const THEME_STORAGE_KEY = "theme"

export type Theme = "light" | "dark" | "system"

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined" || typeof window === "undefined") return

  const root = document.documentElement
  if (!root) return

  let resolvedTheme: "light" | "dark"

  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    resolvedTheme = prefersDark ? "dark" : "light"
  } else {
    resolvedTheme = theme
  }

  if (resolvedTheme === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
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
