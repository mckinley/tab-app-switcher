/**
 * Native Platform Provider
 *
 * Pre-configured PlatformProvider for Electron native app.
 * Automatically applies theme from settings.
 */

import type { ReactNode } from 'react'
import { PlatformProvider, ThemeApplier } from '@tas/lib/platform'
import type { PlatformAdapter } from '@tas/lib/platform'
import type { NativeSettings } from '@tas/lib/settings'
import { nativePlatformAdapter } from './NativePlatformAdapter'

interface NativePlatformProviderProps {
  children: ReactNode
  /** Optional custom adapter (defaults to nativePlatformAdapter) */
  adapter?: PlatformAdapter<NativeSettings>
}

/**
 * Native-specific platform provider
 * Wraps children with platform context pre-configured for Electron.
 * Automatically applies theme from settings.
 *
 * @example
 * // Default (TAS overlay, settings)
 * <NativePlatformProvider>
 *   <TasContent />
 * </NativePlatformProvider>
 *
 * @example
 * // Full capabilities (tab management)
 * <NativePlatformProvider adapter={nativeTabManagementAdapter}>
 *   <TabManagementContent />
 * </NativePlatformProvider>
 */
export function NativePlatformProvider({
  children,
  adapter = nativePlatformAdapter
}: NativePlatformProviderProps): JSX.Element {
  return (
    <PlatformProvider<NativeSettings> adapter={adapter}>
      <ThemeApplier>{children}</ThemeApplier>
    </PlatformProvider>
  )
}
