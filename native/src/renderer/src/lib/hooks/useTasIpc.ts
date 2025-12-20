import { useEffect, useRef } from 'react'
import type { Tab } from '@tas/types/tabs'

interface TasIpcHandlers {
  onResetSelection: () => void
  onNavigate: (direction: 'next' | 'prev') => void
  onSelectCurrent: () => void
  onCloseSelected: () => void
}

/**
 * Hook for managing TAS overlay IPC events from main process.
 *
 * Handles global keyboard shortcuts that arrive via IPC:
 * - reset-selection: Reset to second tab when overlay opens
 * - navigate: Arrow key navigation from global shortcuts
 * - select-current: Enter key to activate selected tab
 * - close-selected-tab: Close the currently selected tab
 *
 * Uses refs internally to avoid stale closure issues with IPC handlers.
 *
 * @example
 * useTasIpc(tabs, selectedIndex, {
 *   onResetSelection: () => { reset(); setSwitcherKey(k => k + 1) },
 *   onNavigate: navigate,
 *   onSelectCurrent: () => { activateTab(tabs[selectedIndex].id) },
 *   onCloseSelected: () => { closeTab(tabs[selectedIndex].id) }
 * })
 */
export function useTasIpc(tabs: Tab[], selectedIndex: number, handlers: TasIpcHandlers): void {
  // Refs to track current values for IPC handlers (avoids stale closures)
  const tabsRef = useRef(tabs)
  const selectedIndexRef = useRef(selectedIndex)
  const handlersRef = useRef(handlers)

  // Keep refs in sync
  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])

  useEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  // Set up IPC listeners
  useEffect(() => {
    const handleResetSelection = (): void => {
      handlersRef.current.onResetSelection()
    }

    const handleNavigateFromMain = (_event: unknown, direction: 'next' | 'prev'): void => {
      handlersRef.current.onNavigate(direction)
    }

    const handleSelectFromMain = (): void => {
      const currentTabs = tabsRef.current
      const currentIndex = selectedIndexRef.current
      if (currentTabs.length > 0 && currentIndex < currentTabs.length) {
        handlersRef.current.onSelectCurrent()
      }
    }

    const handleCloseSelectedTabFromMain = (): void => {
      const currentTabs = tabsRef.current
      const currentIndex = selectedIndexRef.current
      if (currentTabs.length > 0 && currentIndex < currentTabs.length) {
        handlersRef.current.onCloseSelected()
      }
    }

    const unsubscribeResetSelection = window.electron.ipcRenderer.on(
      'reset-selection',
      handleResetSelection
    )
    const unsubscribeNavigate = window.electron.ipcRenderer.on('navigate', handleNavigateFromMain)
    const unsubscribeSelectCurrent = window.electron.ipcRenderer.on(
      'select-current',
      handleSelectFromMain
    )
    const unsubscribeCloseSelectedTab = window.electron.ipcRenderer.on(
      'close-selected-tab',
      handleCloseSelectedTabFromMain
    )

    return () => {
      unsubscribeResetSelection()
      unsubscribeNavigate()
      unsubscribeSelectCurrent()
      unsubscribeCloseSelectedTab()
    }
  }, [])
}
