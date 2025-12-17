import { useState, useEffect } from "react"
import { TabManagement } from "@tas/components/TabManagement"
import { Tab } from "@tas/types/tabs"
import { Container } from "../../components/Container"
import { loadAndApplyTheme } from "../../utils/theme"
import { signInWithGoogleExtension, signOutExtension } from "../../utils/auth"
import "./globals.css"

function App() {
  const [tabs, setTabs] = useState<Tab[]>([])

  // Apply theme on mount
  useEffect(() => {
    loadAndApplyTheme()
  }, [])

  // Connect to background script for push-based tab updates
  useEffect(() => {
    const port = browser.runtime.connect({ name: "tab-management" })

    port.onMessage.addListener((message: { type: string; tabs?: Tab[] }) => {
      if (message.type === "TABS_UPDATED" && message.tabs) {
        setTabs(message.tabs)
      }
    })

    return () => port.disconnect()
  }, [])

  const handleSelectTab = (tabId: string) => {
    browser.tabs.update(parseInt(tabId), { active: true })
  }

  const handleCloseTab = (tabId: string) => {
    browser.tabs.remove(parseInt(tabId))
  }

  const handleReorderTabs = async (tabId: string, newIndex: number, targetWindowId?: number) => {
    try {
      const numericTabId = parseInt(tabId)
      const tab = await browser.tabs.get(numericTabId)

      console.log("handleReorderTabs:", { tabId, newIndex, targetWindowId, currentWindowId: tab.windowId })

      // Move the tab to the target window/index (or same window if not specified)
      // The background script will broadcast the update via TABS_UPDATED
      await browser.tabs.move(numericTabId, {
        windowId: targetWindowId ?? tab.windowId,
        index: newIndex,
      })
    } catch (error) {
      console.error("Error reordering tab:", error)
    }
  }

  const handleSendCollectionToWindow = async (tabUrls: string[]) => {
    try {
      if (tabUrls.length === 0) return

      // Create a new window with the first URL
      const newWindow = await browser.windows.create({
        url: tabUrls[0],
        focused: true,
      })

      // Add remaining URLs as tabs in the new window
      if (newWindow?.id) {
        for (let i = 1; i < tabUrls.length; i++) {
          await browser.tabs.create({
            windowId: newWindow.id,
            url: tabUrls[i],
            active: false,
          })
        }
      }
    } catch (error) {
      console.error("Error creating window from collection:", error)
    }
  }

  return (
    <Container variant="screen" onClose={() => window.close()}>
      <TabManagement
        tabs={tabs}
        onClose={() => window.close()}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onReorderTabs={handleReorderTabs}
        onSendCollectionToWindow={handleSendCollectionToWindow}
        onSignIn={signInWithGoogleExtension}
        onSignOut={signOutExtension}
      />
    </Container>
  )
}

export default App
