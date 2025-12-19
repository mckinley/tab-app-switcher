/**
 * DemoTabsProvider - Provides mock tab data for site demos
 * Enables SortPreview and other tab components to work without browser extension
 */

/* eslint-disable react-refresh/only-export-components -- Exports hook alongside provider */
import { createContext, useContext, useState, type ReactNode } from "react"
import { type Tab } from "@tas/types/tabs"
import { DEMO_TAB_POOL, getShuffledDemoTabs } from "@tas/utils/demoTabs"

export interface DemoTabsContextValue {
  /** Current demo tabs */
  tabs: Tab[]
  /** Shuffle the tabs (reorders with fresh timestamps) */
  shuffleTabs: () => void
  /** Reset to default demo tabs */
  resetTabs: () => void
}

const DemoTabsContext = createContext<DemoTabsContextValue | null>(null)

export interface DemoTabsProviderProps {
  children: ReactNode
  /** Initial tabs (defaults to DEMO_TAB_POOL) */
  initialTabs?: Tab[]
}

export function DemoTabsProvider({ children, initialTabs }: DemoTabsProviderProps) {
  const [tabs, setTabs] = useState<Tab[]>(initialTabs ?? DEMO_TAB_POOL)

  const shuffleTabs = () => {
    setTabs(getShuffledDemoTabs())
  }

  const resetTabs = () => {
    setTabs(DEMO_TAB_POOL)
  }

  const value: DemoTabsContextValue = {
    tabs,
    shuffleTabs,
    resetTabs,
  }

  return <DemoTabsContext.Provider value={value}>{children}</DemoTabsContext.Provider>
}

export function useDemoTabs() {
  const context = useContext(DemoTabsContext)
  if (!context) {
    throw new Error("useDemoTabs must be used within a DemoTabsProvider")
  }
  return context
}
