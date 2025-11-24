import { StrictMode, useState, useEffect } from "react"
import { createRoot } from "react-dom/client"
import { Settings } from "@tas/components/Settings"
import { DEFAULT_SHORTCUTS, KeyboardShortcuts } from "@tas/types/tabs"
import "./assets/globals.css"

function SettingsApp() {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>(DEFAULT_SHORTCUTS)

  // TODO: Load shortcuts from electron store
  useEffect(() => {
    // Will load from electron store
  }, [])

  const handleShortcutsChange = (newShortcuts: KeyboardShortcuts) => {
    setShortcuts(newShortcuts)
    // TODO: Save to electron store and update global shortcuts
    console.log("Shortcuts changed:", newShortcuts)
  }

  return (
    <div className="dark w-full h-full bg-background">
      <Settings shortcuts={shortcuts} onShortcutsChange={handleShortcutsChange} />
    </div>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SettingsApp />
  </StrictMode>
)

