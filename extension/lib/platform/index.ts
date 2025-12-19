/**
 * Extension Platform Module
 *
 * Exports platform adapter and provider for browser extensions.
 */

export { ExtensionPlatformAdapter, extensionPlatformAdapter } from "./ExtensionPlatformAdapter"
export { ExtensionTabManagementAdapter, extensionTabManagementAdapter } from "./ExtensionTabManagementAdapter"
export { ExtensionPlatformProvider } from "./ExtensionPlatformProvider"

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
  useTabActions,
} from "@tas/lib/platform"
