/**
 * Extension Platform Provider
 *
 * Pre-configured PlatformProvider for browser extensions.
 * Automatically applies theme from settings.
 */

import type { ReactNode } from "react"
import { PlatformProvider, ThemeApplier } from "@tas/lib/platform"
import type { PlatformAdapter } from "@tas/lib/platform"
import type { ExtensionSettings } from "@tas/lib/settings"
import { extensionPlatformAdapter } from "./ExtensionPlatformAdapter"

interface ExtensionPlatformProviderProps {
  children: ReactNode
  /** Optional custom adapter (defaults to extensionPlatformAdapter) */
  adapter?: PlatformAdapter<ExtensionSettings>
}

/**
 * Extension-specific platform provider
 * Wraps children with platform context pre-configured for browser extensions.
 * Automatically applies theme from settings.
 *
 * @example
 * // Default (popup/options)
 * <ExtensionPlatformProvider>
 *   <PopupContent />
 * </ExtensionPlatformProvider>
 *
 * @example
 * // Full capabilities (tabs page)
 * <ExtensionPlatformProvider adapter={extensionTabsPageAdapter}>
 *   <TabsContent />
 * </ExtensionPlatformProvider>
 */
export function ExtensionPlatformProvider({
  children,
  adapter = extensionPlatformAdapter,
}: ExtensionPlatformProviderProps): JSX.Element {
  return (
    <PlatformProvider<ExtensionSettings> adapter={adapter}>
      <ThemeApplier>{children}</ThemeApplier>
    </PlatformProvider>
  )
}
