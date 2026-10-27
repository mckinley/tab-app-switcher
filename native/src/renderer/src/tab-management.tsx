import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TabManagement } from '@tas/components/TabManagement'
import { PRODUCTION_API_BASE, setAuthPlatform } from '@tas/utils/appAuth'
import {
  NativePlatformProvider,
  useTabs,
  useTabActions,
  nativeTabManagementAdapter
} from './lib/platform'
import './assets/globals.css'

// The main process signs in through the browser and keeps the token (main/auth.ts)
setAuthPlatform({
  apiBase: PRODUCTION_API_BASE,
  getToken: () => window.api.auth.getToken(),
  signIn: () => window.api.auth.signIn(),
  clearToken: () => window.api.auth.clearToken(),
  subscribe: (onChange) => window.api.auth.onChange(onChange)
})

function TabManagementContent(): JSX.Element {
  const { tabs } = useTabs()
  const { activateTab, closeTab, reorderTabs, createWindowWithTabs } = useTabActions()

  const handleSelectTab = (tabId: string): void => {
    activateTab(tabId)
  }

  const handleCloseTab = (tabId: string): void => {
    // Close tab via adapter - tabs will update via useTabs() subscription
    closeTab(tabId)
  }

  const handleReorderTabs = async (
    tabId: string,
    newIndex: number,
    targetWindowId?: number
  ): Promise<void> => {
    await reorderTabs(tabId, newIndex, targetWindowId)
  }

  const handleSendCollectionToWindow = async (tabUrls: string[]): Promise<void> => {
    await createWindowWithTabs(tabUrls)
  }

  const handleClose = (): void => {
    window.close()
  }

  return (
    <div className="w-full h-screen bg-background">
      <TabManagement
        tabs={tabs}
        onClose={handleClose}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onReorderTabs={handleReorderTabs}
        onSendCollectionToWindow={handleSendCollectionToWindow}
      />
    </div>
  )
}

function TabManagementApp(): JSX.Element {
  return (
    <NativePlatformProvider adapter={nativeTabManagementAdapter}>
      <TabManagementContent />
    </NativePlatformProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TabManagementApp />
  </StrictMode>
)
