/**
 * DemoSettingsProvider - Provides mock settings state for site demos
 * Enables settings components to work without browser extension or native app
 */

/* eslint-disable react-refresh/only-export-components -- Exports hook alongside provider */
import { createContext, useContext, useState, type ReactNode } from "react"
import { type Theme, resolveTheme, applyThemeToDocument, getSystemPrefersDark } from "@tas/lib/theme"
import { type KeyboardSettings, DEFAULT_KEYBOARD_SETTINGS } from "@tas/types/tabs"
import { type SortOrder } from "@tas/components/settings"

export interface DemoSettingsContextValue {
  /** Current theme */
  theme: Theme
  /** Update theme (applies to document) */
  setTheme: (theme: Theme) => void
  /** Current keyboard settings */
  keyboard: KeyboardSettings
  /** Update keyboard settings */
  setKeyboard: (keyboard: KeyboardSettings) => void
  /** Current sort order */
  sortOrder: SortOrder
  /** Update sort order */
  setSortOrder: (order: SortOrder) => void
  /** Demo version string */
  version: string
}

const DemoSettingsContext = createContext<DemoSettingsContextValue | null>(null)

const DEMO_VERSION = "1.2.0 (Demo)"

export interface DemoSettingsProviderProps {
  children: ReactNode
}

export function DemoSettingsProvider({ children }: DemoSettingsProviderProps) {
  const [theme, setThemeState] = useState<Theme>("system")
  const [keyboard, setKeyboard] = useState<KeyboardSettings>(DEFAULT_KEYBOARD_SETTINGS)
  const [sortOrder, setSortOrder] = useState<SortOrder>("activated")

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    const resolved = resolveTheme(newTheme, getSystemPrefersDark())
    applyThemeToDocument(resolved)
  }

  const value: DemoSettingsContextValue = {
    theme,
    setTheme,
    keyboard,
    setKeyboard,
    sortOrder,
    setSortOrder,
    version: DEMO_VERSION,
  }

  return <DemoSettingsContext.Provider value={value}>{children}</DemoSettingsContext.Provider>
}

export function useDemoSettings() {
  const context = useContext(DemoSettingsContext)
  if (!context) {
    throw new Error("useDemoSettings must be used within a DemoSettingsProvider")
  }
  return context
}
