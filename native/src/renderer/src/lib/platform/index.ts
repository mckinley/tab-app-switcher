/**
 * Native Platform Module
 *
 * Exports platform adapter and provider for Electron native app.
 */

export { NativePlatformAdapter, nativePlatformAdapter } from './NativePlatformAdapter'
export {
  NativeTabManagementAdapter,
  nativeTabManagementAdapter
} from './NativeTabManagementAdapter'
export { NativePlatformProvider } from './NativePlatformProvider'

// Re-export hooks from tas/lib/platform for convenience
export {
  usePlatform,
  useSettings,
  useTheme,
  useApplyTheme,
  useSortOrder,
  useTabs,
  useNativeConnection,
  useBrowser,
  useSyncStatus,
  useTabActions
} from '@tas/lib/platform'
