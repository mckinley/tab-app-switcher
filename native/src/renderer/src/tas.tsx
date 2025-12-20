import { StrictMode, useState, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { TabSwitcher } from '@tas/components/TabSwitcher'
import { DEFAULT_KEYBOARD_SETTINGS, KeyboardSettings } from '@tas/types/tabs'
import { useTabNavigation } from '@tas/hooks/useTabNavigation'
import { useTasIpc } from './lib/hooks/useTasIpc'
import { NativePlatformProvider, useTabs, useTabActions, useWindowActions } from './lib/platform'
import './assets/tas.css'

function TasContent(): JSX.Element {
  const { tabs } = useTabs()
  const { activateTab, closeTab, refreshTabs } = useTabActions()
  const { openSettings, openTabManagement } = useWindowActions()
  const { selectedIndex, setSelectedIndex, navigate, reset } = useTabNavigation(tabs)
  const [keyboard] = useState<KeyboardSettings>(DEFAULT_KEYBOARD_SETTINGS)
  // Key to force TabSwitcher remount when window is shown
  const [switcherKey, setSwitcherKey] = useState(0)

  // IPC handlers for global shortcuts from main process
  const ipcHandlers = useMemo(
    () => ({
      onResetSelection: () => {
        reset()
        setSwitcherKey((prev) => prev + 1)
      },
      onNavigate: navigate,
      onSelectCurrent: () => {
        if (tabs.length > 0 && selectedIndex < tabs.length) {
          window.electron.ipcRenderer.send('activate-tab', tabs[selectedIndex].id)
          window.electron.ipcRenderer.send('hide-tas')
        }
      },
      onCloseSelected: () => {
        if (tabs.length > 0 && selectedIndex < tabs.length) {
          window.electron.ipcRenderer.send('close-tab', tabs[selectedIndex].id)
          if (selectedIndex >= tabs.length - 1 && tabs.length > 1) {
            setSelectedIndex(tabs.length - 2)
          }
        }
      }
    }),
    [tabs, selectedIndex, navigate, reset, setSelectedIndex]
  )

  useTasIpc(tabs, selectedIndex, ipcHandlers)

  const handleSelectTab = (tabId: string): void => {
    // Activate tab via adapter, then hide overlay (context-specific behavior)
    activateTab(tabId)
    window.electron.ipcRenderer.send('hide-tas')
  }

  const handleCloseTab = (tabId: string): void => {
    // Close tab via adapter - tabs will update via useTabs() subscription
    closeTab(tabId)
  }

  const handleClose = (): void => {
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
          onNavigate={navigate}
          onCloseTab={handleCloseTab}
          keyboard={keyboard}
          onOpenSettings={openSettings}
          onOpenTabManagement={openTabManagement}
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
