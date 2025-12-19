/**
 * Settings Adapter Module
 *
 * Provides a unified settings abstraction for extension, native, and demo environments.
 */

// Types
export type {
  CommonSettings,
  ExtensionSettings,
  NativeSettings,
  DemoSettings,
  SettingsAdapter,
  SettingsContextValue,
} from "./types"

// Context and Provider
export { SettingsContext, SettingsProvider } from "./SettingsContext"
export type { SettingsProviderProps } from "./SettingsContext"

// Hooks
export { useSettings, useTheme, useSortOrder } from "./useSettings"
