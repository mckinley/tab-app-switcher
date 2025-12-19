import { useState, useEffect, useCallback } from "react"
import { TabSwitcher } from "@tas/components/TabSwitcher"
import { SwitcherContainer } from "@tas/components/SwitcherContainer"
import { DEFAULT_KEYBOARD_SETTINGS } from "@tas/types/tabs"
import { createLogger } from "@tas/utils/logger"
import { ExtensionPlatformProvider, useTabs, useTabActions, useApplyTheme, useSettings } from "../../lib/platform"
import type { ExtensionSettings } from "@tas/lib/settings"
import "./globals.css"

const logger = createLogger("popup-app")

function PopupContent() {
  const { tabs } = useTabs()
  const { activateTab, closeTab, refreshTabs } = useTabActions()
  const { settings } = useSettings<ExtensionSettings>()
  const [selectedIndex, setSelectedIndex] = useState(1) // Start with second tab (index 1)

  // Apply theme from settings
  useApplyTheme()

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

  const handleNavigate = useCallback(
    (direction: "next" | "prev") => {
      setSelectedIndex((prev) => {
        const newIndex = direction === "next" ? (prev + 1) % tabs.length : prev === 0 ? tabs.length - 1 : prev - 1

        return newIndex
      })
    },
    [tabs.length],
  )

  // Listen for messages from background script
  useEffect(() => {
    const messageListener = (message: { type: string; direction?: "next" | "prev" }) => {
      logger.log("Received message in popup:", message)
      if (message.type === "ADVANCE_SELECTION") {
        handleNavigate(message.direction || "next")
      }
    }

    browser.runtime.onMessage.addListener(messageListener)
    return () => {
      browser.runtime.onMessage.removeListener(messageListener)
    }
  }, [handleNavigate]) // Depend on handleNavigate

  // Focus management: ensure popup has focus and close if it loses focus
  useEffect(() => {
    // Focus the window when popup opens
    window.focus()

    // Close popup if window loses focus
    const handleBlur = () => {
      // DEV: leave open for inspector while in development
      // window.close();
    }

    window.addEventListener("blur", handleBlur)
    return () => {
      window.removeEventListener("blur", handleBlur)
    }
  }, [])

  const handleOpenSettingsPage = () => {
    browser.tabs.create({ url: browser.runtime.getURL("/options.html") })
    window.close()
  }

  const handleOpenTabManagementPage = () => {
    browser.tabs.create({ url: browser.runtime.getURL("/tabs.html") })
    window.close()
  }

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
          onNavigate={handleNavigate}
          onCloseTab={handleCloseTab}
          keyboard={keyboard}
          onOpenSettings={handleOpenSettingsPage}
          onOpenTabManagement={handleOpenTabManagementPage}
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
