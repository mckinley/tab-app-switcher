import { StrictMode, useState, useEffect } from "react"
import { createRoot } from "react-dom/client"
import { TabManagement } from "@tas/components/TabManagement"
import { Tab, DEFAULT_SHORTCUTS, KeyboardShortcuts } from "@tas/types/tabs"
import "./assets/globals.css"

function TabManagementApp() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>(DEFAULT_SHORTCUTS)

  // TODO: Load tabs from extension via WebSocket
  const loadTabs = () => {
    // Mock data for now
    setTabs([
      {
        id: "1",
        title: "Google",
        url: "https://google.com",
        favicon: "https://www.google.com/favicon.ico",
      },
      {
        id: "2",
        title: "GitHub",
        url: "https://github.com",
        favicon: "https://github.com/favicon.ico",
      },
    ])
  }

  useEffect(() => {
    loadTabs()
  }, [])

  // TODO: Load shortcuts from electron store
  useEffect(() => {
    // Will load from electron store
  }, [])

  const handleSelectTab = (tabId: string) => {
    // TODO: Send message to extension to activate tab
    console.log("Activate tab:", tabId)
  }

  const handleCloseTab = (tabId: string) => {
    // TODO: Send message to extension to close tab
    console.log("Close tab:", tabId)
    setTabs((prev) => prev.filter((tab) => tab.id !== tabId))
  }

  const handleReorderTabs = async (tabId: string, newIndex: number) => {
    // TODO: Send message to extension to reorder tab
    console.log("Reorder tab:", tabId, "to index:", newIndex)
  }

  const handleSendCollectionToWindow = async (tabUrls: string[]) => {
    // TODO: Send message to extension to create new window with tabs
    console.log("Create window with tabs:", tabUrls)
  }

  const handleShortcutsChange = (newShortcuts: KeyboardShortcuts) => {
    setShortcuts(newShortcuts)
    // TODO: Save to electron store
    console.log("Shortcuts changed:", newShortcuts)
  }

  const handleClose = () => {
    window.close()
  }

  return (
    <div className="dark w-full h-full bg-background">
      <TabManagement
        tabs={tabs}
        onClose={handleClose}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onReorderTabs={handleReorderTabs}
        onSendCollectionToWindow={handleSendCollectionToWindow}
        shortcuts={shortcuts}
        onShortcutsChange={handleShortcutsChange}
      />
    </div>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TabManagementApp />
  </StrictMode>
)

