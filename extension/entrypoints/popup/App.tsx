import { useState, useEffect, useMemo } from "react"
import { TabSwitcher } from "@tas/components/TabSwitcher"
import { SwitcherContainer } from "@tas/components/SwitcherContainer"
import { DEFAULT_KEYBOARD_SETTINGS } from "@tas/types/tabs"
import { useTabNavigation } from "@tas/hooks/useTabNavigation"
import { usePopupMessages } from "../../lib/hooks/usePopupMessages"
import { ExtensionPlatformProvider, useTabs, useTabActions, useSettings, useWindowActions } from "../../lib/platform"
import type { ExtensionSettings } from "@tas/lib/settings"
import "./globals.css"

function PopupContent() {
  const { tabs } = useTabs()
  const { activateTab, closeTab, refreshTabs } = useTabActions()
  const { settings } = useSettings<ExtensionSettings>()
  const { selectedIndex, navigate } = useTabNavigation(tabs)
  const { openSettings, openTabManagement } = useWindowActions()

  // Get keyboard config from settings, falling back to defaults
  const keyboard = settings?.keyboard ?? DEFAULT_KEYBOARD_SETTINGS

  const handleSelectTab = (tabId: string) => {
    // Activate tab via adapter, then close popup (context-specific behavior)
    activateTab(tabId).then(() => {
      window.close()
    })
  }

  const handleCloseTab = (tabId: string) => {
    // Close tab via adapter - tab list will update via useTabs() subscription
    closeTab(tabId)
  }

  // Handle messages from background script (global shortcuts)
  const messageHandlers = useMemo(() => ({ onAdvanceSelection: navigate }), [navigate])
  usePopupMessages(messageHandlers)

  // Focus management: ensure popup has focus and close if it loses focus
  useEffect(() => {
    // Focus the window when popup opens
    window.focus()

    // Close popup if window loses focus
    const handleBlur = () => {
      // TODO: should this be re-enabled?
      // window.close();
    }

    window.addEventListener("blur", handleBlur)
    return () => {
      window.removeEventListener("blur", handleBlur)
    }
  }, [])

  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    refreshTabs()
      .then(() => {
        // Give a brief visual feedback before clearing state
        setTimeout(() => setIsRefreshing(false), 500)
      })
      .catch(() => {
        setIsRefreshing(false)
      })
  }

  return (
    <div className="w-[360px] h-[480px] bg-background">
      <SwitcherContainer variant="fill" onClose={() => window.close()}>
        <TabSwitcher
          tabs={tabs}
          selectedIndex={selectedIndex}
          onSelectTab={handleSelectTab}
          onClose={() => window.close()}
          onNavigate={navigate}
          onCloseTab={handleCloseTab}
          keyboard={keyboard}
          onOpenSettings={openSettings}
          onOpenTabManagement={openTabManagement}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      </SwitcherContainer>
    </div>
  )
}

function App() {
  return (
    <ExtensionPlatformProvider>
      <PopupContent />
    </ExtensionPlatformProvider>
  )
}

export default App
