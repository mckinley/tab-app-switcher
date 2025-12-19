/**
 * Extension Settings Provider
 *
 * Pre-configured SettingsProvider for browser extensions
 */

import type { ReactNode } from "react"
import { SettingsProvider } from "@tas/lib/settings"
import { extensionSettingsAdapter } from "./ExtensionSettingsAdapter"

export interface ExtensionSettingsProviderProps {
  children: ReactNode
}

export function ExtensionSettingsProvider({ children }: ExtensionSettingsProviderProps): JSX.Element {
  return <SettingsProvider adapter={extensionSettingsAdapter}>{children}</SettingsProvider>
}
