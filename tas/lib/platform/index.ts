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

// Base Adapter
export { BasePlatformAdapter } from "./BasePlatformAdapter"

// Context and Provider
export { PlatformContext, PlatformProvider } from "./PlatformContext"
export type { PlatformProviderProps } from "./PlatformContext"

// Components
export { ThemeApplier } from "./ThemeApplier"

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
  useWindowActions,
  useTabActions,
  useEscapeKey,
} from "./hooks"
