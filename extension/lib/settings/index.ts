/**
 * Extension Settings Module
 *
 * Provides settings adapter and provider for browser extensions
 */

export { ExtensionSettingsAdapter, extensionSettingsAdapter } from "./ExtensionSettingsAdapter"
export { ExtensionSettingsProvider } from "./ExtensionSettingsProvider"
export type { ExtensionSettingsProviderProps } from "./ExtensionSettingsProvider"

// Re-export types and hooks from tas for convenience
export type { ExtensionSettings } from "@tas/lib/settings"
export { useSettings, useTheme, useSortOrder } from "@tas/lib/settings"
