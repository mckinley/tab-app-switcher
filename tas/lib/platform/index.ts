/**
 * Platform Module
 *
 * Provides the adapter pattern for platform-specific capabilities.
 * Extends the settings adapter to include tabs, native connection, browser info, and sync.
 */

// Types
export type {
  PlatformCapabilities,
  PlatformAdapter,
  PlatformContextValue,
  ActionResult,
  ActionCapabilities,
} from "./types"

export { DEFAULT_CAPABILITIES, DEFAULT_NATIVE_DOWNLOAD_URL, DEFAULT_ACTION_CAPABILITIES } from "./types"

// Context and Provider
export { PlatformContext, PlatformProvider } from "./PlatformContext"
export type { PlatformProviderProps } from "./PlatformContext"

// Hooks
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
  useTabActions,
  useEscapeKey,
} from "./hooks"
