/**
 * Settings Hooks
 *
 * Provides hooks for consuming settings in React components.
 */

import { useContext, useCallback } from "react"
import { SettingsContext } from "./SettingsContext"
import type { CommonSettings, SettingsContextValue } from "./types"
import type { Theme } from "../theme"
import type { SortOrder } from "../../sorting"

/**
 * Main settings hook
 * Returns the full settings context value
 *
 * @example
 * // Generic usage
 * const { settings, updateSetting, isLoading } = useSettings()
 *
 * @example
 * // Type-safe for specific platform
 * const { settings } = useSettings<ExtensionSettings>()
 * if (settings) {
 *   console.log(settings.shortcuts) // TypeScript knows this exists
 * }
 */
export function useSettings<T extends CommonSettings = CommonSettings>(): SettingsContextValue<T> {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context as unknown as SettingsContextValue<T>
}

/**
 * Convenience hook for theme setting
 *
 * @example
 * const { theme, setTheme, isLoading } = useTheme()
 * setTheme('dark')
 */
export function useTheme(): {
  theme: Theme
  setTheme: (theme: Theme) => Promise<void>
  isLoading: boolean
} {
  const { settings, updateSetting, isLoading } = useSettings()

  const setTheme = useCallback((theme: Theme) => updateSetting("theme", theme), [updateSetting])

  return {
    theme: settings?.theme ?? "system",
    setTheme,
    isLoading,
  }
}

/**
 * Convenience hook for sort order setting
 *
 * @example
 * const { sortOrder, setSortOrder, isLoading } = useSortOrder()
 * setSortOrder('accessed')
 */
export function useSortOrder(): {
  sortOrder: SortOrder
  setSortOrder: (order: SortOrder) => Promise<void>
  isLoading: boolean
} {
  const { settings, updateSetting, isLoading } = useSettings()

  const setSortOrder = useCallback((order: SortOrder) => updateSetting("sortOrder", order), [updateSetting])

  return {
    sortOrder: settings?.sortOrder ?? "activated",
    setSortOrder,
    isLoading,
  }
}
