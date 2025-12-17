import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { TabManagement } from '@tas/components/TabManagement'
import { Tab } from '@tas/types/tabs'
import { supabase } from '@tas/utils/supabase'
import './assets/globals.css'

// eslint-disable-next-line react-refresh/only-export-components
function TabManagementApp(): JSX.Element {
  const [tabs, setTabs] = useState<Tab[]>([])

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

  // Load tabs from cached data (sent from main process)
  useEffect(() => {
    console.log('Tab Management: Requesting tabs from main process')
    // Request initial tabs from main process
    window.electron.ipcRenderer.send('request-tabs')

    // Listen for tab updates from main process
    const unsubscribe = window.electron.ipcRenderer.on(
      'tabs-updated',
      (_event: unknown, updatedTabs: Tab[]): void => {
        console.log('Tab Management: Received tabs update:', updatedTabs.length, 'tabs')
        setTabs(updatedTabs)
      }
    )

    return () => {
      unsubscribe()
    }
  }, [])

  const handleSelectTab = (tabId: string): void => {
    // TODO: Send message to extension to activate tab
    console.log('Activate tab:', tabId)
  }

  const handleCloseTab = (tabId: string): void => {
    // TODO: Send message to extension to close tab
    console.log('Close tab:', tabId)
    setTabs((prev) => prev.filter((tab) => tab.id !== tabId))
  }

  const handleReorderTabs = async (
    tabId: string,
    newIndex: number,
    targetWindowId?: number
  ): Promise<void> => {
    // TODO: Send message to extension to reorder tab
    console.log('Reorder tab:', tabId, 'to index:', newIndex, 'in window:', targetWindowId)
  }

  const handleSendCollectionToWindow = async (tabUrls: string[]): Promise<void> => {
    // TODO: Send message to extension to create new window with tabs
    console.log('Create window with tabs:', tabUrls)
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TabManagementApp />
  </StrictMode>
)
