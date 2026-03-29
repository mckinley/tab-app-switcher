import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { TabManagement } from '@tas/components/TabManagement'
import { setAuthHeaderProvider } from '@tas/utils/collectionsSync'
import {
  NativePlatformProvider,
  useTabs,
  useTabActions,
  nativeTabManagementAdapter
} from './lib/platform'
import './assets/globals.css'

// Store bearer token in memory (received from main process via IPC)
let bearerToken: string | null = null

// Initialize auth header provider for collections sync
setAuthHeaderProvider(async (): Promise<Record<string, string>> => {
  return bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}
})

function TabManagementContent(): JSX.Element {
  const { tabs } = useTabs()
  const { activateTab, closeTab, reorderTabs, createWindowWithTabs } = useTabActions()

  // Listen for auth token from main process
  useEffect(() => {
    window.api.auth.onToken((token: string) => {
      bearerToken = token
    })

    window.api.auth.onSignedOut(() => {
      bearerToken = null
    })
  }, [])

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

  const handleSignIn = async (): Promise<void> => {
    window.api.auth.signIn()
  }

  const handleSignOut = async (): Promise<void> => {
    window.api.auth.signOut()
    bearerToken = null
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
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
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
