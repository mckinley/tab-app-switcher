const THEME_STORAGE_KEY = "theme"

type ThemeOption = "light" | "dark" | "system"

export function applyTheme(theme: ThemeOption): void {
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

export async function loadAndApplyTheme(): Promise<void> {
  const result = await browser.storage.local.get(THEME_STORAGE_KEY)
  const stored = result[THEME_STORAGE_KEY] as ThemeOption | undefined
  const theme = stored ?? "system"
  applyTheme(theme)
}
