/**
 * Native Settings Module
 *
 * Provides settings adapter and provider for the Electron native app
 */

export { NativeSettingsAdapter, nativeSettingsAdapter } from './NativeSettingsAdapter'
export { NativeSettingsProvider } from './NativeSettingsProvider'
export type { NativeSettingsProviderProps } from './NativeSettingsProvider'

// Re-export types and hooks from tas for convenience
export type { NativeSettings } from '@tas/lib/settings'
export { useSettings, useTheme, useSortOrder } from '@tas/lib/settings'
