import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { TabManagement } from '@tas/components/TabManagement'
import { supabase } from '@tas/utils/supabase'
import {
  NativePlatformProvider,
  useTabs,
  useTabActions,
  nativeTabManagementAdapter
} from './lib/platform'
import './assets/globals.css'

function TabManagementContent(): JSX.Element {
  const { tabs } = useTabs()
  const { activateTab, closeTab, reorderTabs, createWindowWithTabs } = useTabActions()

  // Listen for auth tokens from main process
  useEffect(() => {
    window.api.auth.onTokens(async (tokens) => {
      await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken
      })
    })

    window.api.auth.onSignedOut(async () => {
      await supabase.auth.signOut()
    })
  }, [])

  // Apply system theme on mount
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
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
    await supabase.auth.signOut()
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
