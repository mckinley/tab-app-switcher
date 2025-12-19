import { StrictMode, useState, useEffect, useCallback, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { TabSwitcher } from '@tas/components/TabSwitcher'
import { DEFAULT_KEYBOARD_SETTINGS, KeyboardSettings } from '@tas/types/tabs'
import { NativePlatformProvider, useTabs, useTabActions } from './lib/platform'
import './assets/tas.css'

function TasContent(): JSX.Element {
  const { tabs } = useTabs()
  const { activateTab, closeTab, refreshTabs } = useTabActions()
  const [selectedIndex, setSelectedIndex] = useState(1)
  const [keyboard] = useState<KeyboardSettings>(DEFAULT_KEYBOARD_SETTINGS)
  // Key to force TabSwitcher remount when window is shown
  const [switcherKey, setSwitcherKey] = useState(0)

  // Refs to track current values for IPC handlers
  const tabsRef = useRef(tabs)
  const selectedIndexRef = useRef(selectedIndex)

  // Keep refs in sync
  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])

  useEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  // Apply system theme on mount
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Handle window-specific IPC events (not tabs - those come from useTabs)
  useEffect(() => {
    const handleResetSelection = (): void => {
      const currentTabs = tabsRef.current
      // Reset selection to second tab when window is shown
      if (currentTabs.length > 1) {
        setSelectedIndex(1)
      } else if (currentTabs.length === 1) {
        setSelectedIndex(0)
      }
      // Force TabSwitcher to remount to reset scroll position
      setSwitcherKey((prev) => prev + 1)
    }

    // Handle navigation from main process (global shortcuts when window doesn't have focus)
    const handleNavigateFromMain = (_event: unknown, direction: 'next' | 'prev'): void => {
      const currentTabs = tabsRef.current
      if (currentTabs.length === 0) return
      setSelectedIndex((prev) => {
        if (direction === 'next') {
          return (prev + 1) % currentTabs.length
        } else {
          return prev === 0 ? currentTabs.length - 1 : prev - 1
        }
      })
    }

    // Handle select from main process (Enter key via global shortcut)
    const handleSelectFromMain = (): void => {
      const currentTabs = tabsRef.current
      const currentIndex = selectedIndexRef.current
      if (currentTabs.length > 0 && currentIndex < currentTabs.length) {
        const tab = currentTabs[currentIndex]
        window.electron.ipcRenderer.send('activate-tab', tab.id)
        window.electron.ipcRenderer.send('hide-tas')
      }
    }

    // Handle close selected tab from main process (Alt+W global shortcut)
    const handleCloseSelectedTabFromMain = (): void => {
      const currentTabs = tabsRef.current
      const currentIndex = selectedIndexRef.current
      if (currentTabs.length > 0 && currentIndex < currentTabs.length) {
        const tab = currentTabs[currentIndex]
        window.electron.ipcRenderer.send('close-tab', tab.id)
        // Adjust selection if needed (tabs will update via useTabs subscription)
        if (currentIndex >= currentTabs.length - 1 && currentTabs.length > 1) {
          setSelectedIndex(currentTabs.length - 2)
        }
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

  const handleSelectTab = (tabId: string): void => {
    // Activate tab via adapter, then hide overlay (context-specific behavior)
    activateTab(tabId)
    window.electron.ipcRenderer.send('hide-tas')
  }

  const handleCloseTab = (tabId: string): void => {
    // Close tab via adapter - tabs will update via useTabs() subscription
    closeTab(tabId)
  }

  const handleNavigate = useCallback(
    (direction: 'next' | 'prev'): void => {
      setSelectedIndex((prev) => {
        const newIndex =
          direction === 'next' ? (prev + 1) % tabs.length : prev === 0 ? tabs.length - 1 : prev - 1
        return newIndex
      })
    },
    [tabs.length]
  )

  const handleClose = (): void => {
    window.electron.ipcRenderer.send('hide-tas')
  }

  const handleOpenSettings = (): void => {
    window.electron.ipcRenderer.send('show-settings')
    window.electron.ipcRenderer.send('hide-tas')
  }

  const handleOpenTabManagement = (): void => {
    window.electron.ipcRenderer.send('show-tab-management')
    window.electron.ipcRenderer.send('hide-tas')
  }

  const handleRefresh = (): void => {
    refreshTabs()
  }

  // Handle clicks on the transparent background (dismiss overlay)
  const handleBackgroundClick = (e: React.MouseEvent): void => {
    // Only dismiss if clicking the background itself, not the content
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  return (
    // Full-screen container to capture all clicks (like macOS app switcher)
    // Clicking anywhere on the background dismisses the overlay
    <div
      className="w-screen h-screen flex items-center justify-center cursor-default"
      onClick={handleBackgroundClick}
    >
      {/* The actual overlay content */}
      <div className="w-[600px] h-[400px] bg-background/95 backdrop-blur-md rounded-lg shadow-2xl border border-border">
        <TabSwitcher
          key={switcherKey}
          tabs={tabs}
          selectedIndex={selectedIndex}
          onSelectTab={handleSelectTab}
          onClose={handleClose}
          onNavigate={handleNavigate}
          onCloseTab={handleCloseTab}
          keyboard={keyboard}
          onOpenSettings={handleOpenSettings}
          onOpenTabManagement={handleOpenTabManagement}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  )
}

function TasApp(): JSX.Element {
  return (
    <NativePlatformProvider>
      <TasContent />
    </NativePlatformProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TasApp />
  </StrictMode>
)
