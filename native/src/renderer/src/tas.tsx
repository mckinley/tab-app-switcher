import { StrictMode, useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { TabSwitcher } from '@tas/components/TabSwitcher'
import { Tab, DEFAULT_SHORTCUTS, KeyboardShortcuts } from '@tas/types/tabs'
import './assets/tas.css'

// eslint-disable-next-line react-refresh/only-export-components
function TasApp(): JSX.Element {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [selectedIndex, setSelectedIndex] = useState(1)
  const [shortcuts] = useState<KeyboardShortcuts>(DEFAULT_SHORTCUTS)
  // Key to force TabSwitcher remount when window is shown
  const [switcherKey, setSwitcherKey] = useState(0)

  // Apply system theme on mount
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Load tabs from extension
  useEffect(() => {
    const handleTabsUpdated = (_event: unknown, tabsData: Tab[]): void => {
      if (tabsData && tabsData.length > 0) {
        setTabs(tabsData)
        // Reset selection to second tab (index 1) when tabs update
        setSelectedIndex(tabsData.length > 1 ? 1 : 0)
      }
    }

    const handleResetSelection = (): void => {
      // Reset selection to second tab when window is shown
      setSelectedIndex((prev) => {
        // Only reset if we have tabs
        if (tabs.length > 1) {
          return 1
        } else if (tabs.length === 1) {
          return 0
        }
        return prev
      })
      // Force TabSwitcher to remount to reset scroll position
      setSwitcherKey((prev) => prev + 1)
    }

    // Handle navigation from main process (global shortcuts when window doesn't have focus)
    const handleNavigateFromMain = (_event: unknown, direction: 'next' | 'prev'): void => {
      setSelectedIndex((prev) => {
        if (tabs.length === 0) return prev
        if (direction === 'next') {
          return (prev + 1) % tabs.length
        } else {
          return prev === 0 ? tabs.length - 1 : prev - 1
        }
      })
    }

    // Handle select from main process (Enter key via global shortcut)
    const handleSelectFromMain = (): void => {
      // We need to get current tabs and selectedIndex to select the right tab
      // This is a bit tricky with closures, so we'll use a ref pattern or just trigger click
      setTabs((currentTabs) => {
        setSelectedIndex((currentIndex) => {
          if (currentTabs.length > 0 && currentIndex < currentTabs.length) {
            const tab = currentTabs[currentIndex]
            window.electron.ipcRenderer.send('activate-tab', tab.id)
            window.electron.ipcRenderer.send('hide-tas')
          }
          return currentIndex
        })
        return currentTabs
      })
    }

    // Handle close selected tab from main process (Alt+W global shortcut)
    const handleCloseSelectedTabFromMain = (): void => {
      setTabs((currentTabs) => {
        setSelectedIndex((currentIndex) => {
          if (currentTabs.length > 0 && currentIndex < currentTabs.length) {
            const tab = currentTabs[currentIndex]
            window.electron.ipcRenderer.send('close-tab', tab.id)
            // Return filtered tabs and adjust index
            const newTabs = currentTabs.filter((t) => t.id !== tab.id)
            setTabs(newTabs)
            // Adjust selection if needed
            if (currentIndex >= newTabs.length && newTabs.length > 0) {
              return newTabs.length - 1
            }
          }
          return currentIndex
        })
        return currentTabs
      })
    }

    const unsubscribeTabsUpdated = window.electron.ipcRenderer.on('tabs-updated', handleTabsUpdated)
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
      unsubscribeTabsUpdated()
      unsubscribeResetSelection()
      unsubscribeNavigate()
      unsubscribeSelectCurrent()
      unsubscribeCloseSelectedTab()
    }
  }, [tabs.length])

  const handleSelectTab = (tabId: string): void => {
    window.electron.ipcRenderer.send('activate-tab', tabId)
    window.electron.ipcRenderer.send('hide-tas')
  }

  const handleCloseTab = (tabId: string): void => {
    window.electron.ipcRenderer.send('close-tab', tabId)
    // Optimistically update UI
    setTabs((prev) => prev.filter((tab) => tab.id !== tabId))
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
    window.electron.ipcRenderer.send('refresh-tabs')
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
          shortcuts={shortcuts}
          onOpenSettings={handleOpenSettings}
          onOpenTabManagement={handleOpenTabManagement}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TasApp />
  </StrictMode>
)
