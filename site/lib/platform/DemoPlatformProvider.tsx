/**
 * Demo Platform Provider
 *
 * Pre-configured PlatformProvider for the demo site.
 */

import type { ReactNode } from "react"
import { PlatformProvider } from "@tas/lib/platform"
import type { DemoSettings } from "@tas/lib/settings"
import { demoPlatformAdapter } from "./DemoPlatformAdapter"

interface DemoPlatformProviderProps {
  children: ReactNode
}

/**
 * Demo-specific platform provider
 * Wraps children with platform context pre-configured for demo site
 */
export function DemoPlatformProvider({ children }: DemoPlatformProviderProps): JSX.Element {
  return <PlatformProvider<DemoSettings> adapter={demoPlatformAdapter}>{children}</PlatformProvider>
}
