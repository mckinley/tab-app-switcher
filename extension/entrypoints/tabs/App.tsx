import { useState, useEffect } from "react"
import { TabManagement } from "@tas/components/TabManagement"
import { Tab, DEFAULT_SHORTCUTS, KeyboardShortcuts } from "@tas/types/tabs"
import { ThemeToggle } from "../../components/ThemeToggle"
import { Container } from "../../components/Container"
import { loadAndApplyTheme } from "../../utils/theme"
import "./globals.css"

function App() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>(DEFAULT_SHORTCUTS)

  // Apply theme on mount
  useEffect(() => {
    loadAndApplyTheme()
  }, [])

  const loadTabs = () => {
    browser.runtime.sendMessage({ type: "GET_TABS" }).then((response) => {
      if (response?.tabs) {
        setTabs(response.tabs)
      }
    })
  }

  useEffect(() => {
    loadTabs()

    // Load shortcuts from storage
    browser.storage.local.get("shortcuts").then((result) => {
      if (result.shortcuts) {
        setShortcuts(result.shortcuts)
      }
    })

    const handleTabUpdate = () => {
      loadTabs()
    }

    browser.tabs.onUpdated.addListener(handleTabUpdate)
    browser.tabs.onRemoved.addListener(handleTabUpdate)
    browser.tabs.onCreated.addListener(handleTabUpdate)
    browser.tabs.onActivated.addListener(handleTabUpdate)
    browser.windows.onFocusChanged.addListener(handleTabUpdate)

    return () => {
      browser.tabs.onUpdated.removeListener(handleTabUpdate)
      browser.tabs.onRemoved.removeListener(handleTabUpdate)
      browser.tabs.onCreated.removeListener(handleTabUpdate)
      browser.tabs.onActivated.removeListener(handleTabUpdate)
      browser.windows.onFocusChanged.removeListener(handleTabUpdate)
    }
  }, [])

  const handleSelectTab = (tabId: string) => {
    browser.tabs.update(parseInt(tabId), { active: true })
  }

  const handleCloseTab = (tabId: string) => {
    browser.tabs.remove(parseInt(tabId))
  }

  const handleShortcutsChange = (newShortcuts: KeyboardShortcuts) => {
    setShortcuts(newShortcuts)
    browser.storage.local.set({ shortcuts: newShortcuts })
  }

  const handleReorderTabs = async (tabId: string, newIndex: number, targetWindowId?: number) => {
    try {
      const numericTabId = parseInt(tabId)
      const tab = await browser.tabs.get(numericTabId)

      console.log("handleReorderTabs:", { tabId, newIndex, targetWindowId, currentWindowId: tab.windowId })

      // Move the tab to the target window/index (or same window if not specified)
      await browser.tabs.move(numericTabId, {
        windowId: targetWindowId ?? tab.windowId,
        index: newIndex,
      })

      // Reload tabs to reflect the change
      loadTabs()
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
        shortcuts={shortcuts}
        onShortcutsChange={handleShortcutsChange}
        settingsThemeToggle={<ThemeToggle />}
      />
    </Container>
  )
}

export default App
