/**
 * Demo Platform Module
 *
 * Exports platform adapter and provider for the demo site.
 */

export { DemoPlatformAdapter, demoPlatformAdapter } from "./DemoPlatformAdapter"
export { DemoPlatformProvider } from "./DemoPlatformProvider"

// Re-export hooks from tas/lib/platform for convenience
export {
  usePlatform,
  useSettings,
  useTheme,
  useSortOrder,
  useTabs,
  useNativeConnection,
  useBrowser,
  useSyncStatus,
} from "@tas/lib/platform"
