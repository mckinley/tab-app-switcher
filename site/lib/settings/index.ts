/**
 * Demo Site Settings Module
 *
 * Provides settings adapter and provider for the demo site
 */

export { DemoSettingsAdapter, demoSettingsAdapter } from "./DemoSettingsAdapter"
export { DemoSettingsProvider } from "./DemoSettingsProvider"
export type { DemoSettingsProviderProps } from "./DemoSettingsProvider"

// Re-export types and hooks from tas for convenience
export type { DemoSettings } from "@tas/lib/settings"
export { useSettings, useTheme, useSortOrder } from "@tas/lib/settings"
