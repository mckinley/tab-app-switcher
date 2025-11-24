import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Settings } from '@tas/components/Settings'
import { DEFAULT_SHORTCUTS, KeyboardShortcuts } from '@tas/types/tabs'
import './assets/globals.css'

// eslint-disable-next-line react-refresh/only-export-components
function SettingsApp(): JSX.Element {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>(DEFAULT_SHORTCUTS)

  // Apply system theme on mount
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // TODO: Load shortcuts from electron store
  useEffect(() => {
    // Will load from electron store
  }, [])

  const handleShortcutsChange = (newShortcuts: KeyboardShortcuts): void => {
    setShortcuts(newShortcuts)
    // TODO: Save to electron store and update global shortcuts
    console.log('Shortcuts changed:', newShortcuts)
  }

  return (
    <div className="w-full h-full bg-background p-6">
      <Settings shortcuts={shortcuts} onShortcutsChange={handleShortcutsChange} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsApp />
  </StrictMode>
)
