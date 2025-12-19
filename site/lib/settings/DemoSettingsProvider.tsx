/**
 * Demo Settings Provider
 *
 * Pre-configured SettingsProvider for the demo site
 */

import type { ReactNode } from "react"
import { SettingsProvider } from "@tas/lib/settings"
import { demoSettingsAdapter } from "./DemoSettingsAdapter"

export interface DemoSettingsProviderProps {
  children: ReactNode
}

export function DemoSettingsProvider({ children }: DemoSettingsProviderProps): JSX.Element {
  return <SettingsProvider adapter={demoSettingsAdapter}>{children}</SettingsProvider>
}
