import { StrictMode, useState, useEffect, useCallback } from "react"
import { createRoot } from "react-dom/client"
import { TabSwitcher } from "@tas/components/TabSwitcher"
import { Tab, DEFAULT_SHORTCUTS, KeyboardShortcuts } from "@tas/types/tabs"
import "./assets/tas.css"

function TasApp() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [selectedIndex, setSelectedIndex] = useState(1)
  const [shortcuts] = useState<KeyboardShortcuts>(DEFAULT_SHORTCUTS)

  // Load tabs from extension
  useEffect(() => {
    const handleTabsUpdated = (_event: unknown, tabsData: Tab[]) => {
      if (tabsData && tabsData.length > 0) {
        setTabs(tabsData)
        // Reset selection to second tab (index 1) when tabs update
        setSelectedIndex(tabsData.length > 1 ? 1 : 0)
      }
    }

    window.electron.ipcRenderer.on("tabs-updated", handleTabsUpdated)

    return () => {
      window.electron.ipcRenderer.removeListener("tabs-updated", handleTabsUpdated)
    }
  }, [])

  const handleSelectTab = (tabId: string) => {
    window.electron.ipcRenderer.send("activate-tab", tabId)
    window.electron.ipcRenderer.send("hide-tas")
  }

  const handleCloseTab = (tabId: string) => {
    window.electron.ipcRenderer.send("close-tab", tabId)
    // Optimistically update UI
    setTabs((prev) => prev.filter((tab) => tab.id !== tabId))
  }

  const handleNavigate = useCallback(
    (direction: "next" | "prev") => {
      setSelectedIndex((prev) => {
        const newIndex =
          direction === "next" ? (prev + 1) % tabs.length : prev === 0 ? tabs.length - 1 : prev - 1
        return newIndex
      })
    },
    [tabs.length]
  )

  const handleClose = () => {
    window.electron.ipcRenderer.send("hide-tas")
  }

  const handleOpenSettings = () => {
    window.electron.ipcRenderer.send("show-settings")
    window.electron.ipcRenderer.send("hide-tas")
  }

  const handleOpenTabManagement = () => {
    window.electron.ipcRenderer.send("show-tab-management")
    window.electron.ipcRenderer.send("hide-tas")
  }

  return (
    <div className="dark">
      <div className="w-[600px] h-[400px] bg-background/95 backdrop-blur-md rounded-lg shadow-2xl border border-border">
        <TabSwitcher
          tabs={tabs}
          selectedIndex={selectedIndex}
          onSelectTab={handleSelectTab}
          onClose={handleClose}
          onNavigate={handleNavigate}
          onCloseTab={handleCloseTab}
          shortcuts={shortcuts}
          onOpenSettings={handleOpenSettings}
          onOpenTabManagement={handleOpenTabManagement}
        />
      </div>
    </div>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TasApp />
  </StrictMode>
)

