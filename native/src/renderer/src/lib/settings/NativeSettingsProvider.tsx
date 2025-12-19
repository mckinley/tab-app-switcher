/**
 * Native Settings Provider
 *
 * Pre-configured SettingsProvider for the Electron native app
 */

import type { ReactNode } from 'react'
import { SettingsProvider } from '@tas/lib/settings'
import { nativeSettingsAdapter } from './NativeSettingsAdapter'

export interface NativeSettingsProviderProps {
  children: ReactNode
}

export function NativeSettingsProvider({ children }: NativeSettingsProviderProps): JSX.Element {
  return <SettingsProvider adapter={nativeSettingsAdapter}>{children}</SettingsProvider>
}
