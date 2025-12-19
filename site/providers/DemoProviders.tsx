/**
 * DemoProviders - Combined provider wrapper for site demos
 * Wraps children with all demo providers for a complete demo experience
 */

/* eslint-disable react-refresh/only-export-components -- Re-exports hooks alongside provider */
import { type ReactNode } from "react"
import { DemoSettingsProvider } from "./DemoSettingsProvider"
import { DemoTabsProvider } from "./DemoTabsProvider"

export interface DemoProvidersProps {
  children: ReactNode
}

export function DemoProviders({ children }: DemoProvidersProps) {
  return (
    <DemoSettingsProvider>
      <DemoTabsProvider>{children}</DemoTabsProvider>
    </DemoSettingsProvider>
  )
}

// Re-export hooks for convenience
export { useDemoSettings } from "./DemoSettingsProvider"
export { useDemoTabs } from "./DemoTabsProvider"
