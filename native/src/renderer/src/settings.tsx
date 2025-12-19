import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import {
  KeyboardSettings,
  ThemeSettings,
  AboutSettings,
  NativeSettings,
  NativeConnectionStatus,
  SettingsLayout,
  SortSettings,
  SortPreview,
  SettingsSync,
  type SettingsTabConfig
} from '@tas/components/settings'
import { Info, Palette, Keyboard, SlidersHorizontal, Plug2, ArrowUpDown } from 'lucide-react'
import {
  DEFAULT_KEYBOARD_SETTINGS,
  KeyboardSettings as KeyboardSettingsType
} from '@tas/types/tabs'
import {
  NativePlatformProvider,
  useSettings,
  useSyncStatus,
  useSortOrder,
  useTabs
} from './lib/platform'
import type { NativeSettings as NativeSettingsType } from '@tas/lib/settings'
import './assets/globals.css'

// Tab values in alphabetical order
type SettingsTab = 'about' | 'appearance' | 'connection' | 'keys' | 'options' | 'sorting'

// Get initial tab from URL query parameter
function getInitialTab(): SettingsTab {
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab')
  if (tab === 'about') return 'about'
  if (tab === 'appearance') return 'appearance'
  if (tab === 'connection' || tab === 'setup') return 'connection'
  if (tab === 'options') return 'options'
  if (tab === 'sorting') return 'sorting'
  return 'about' // Default to about
}

/**
 * Connection tab content - NativeConnectionStatus + Sync
 */
function ConnectionTabContent(): JSX.Element {
  const { syncStatus, sync, isSyncing } = useSyncStatus()

  return (
    <div className="space-y-6">
      <NativeConnectionStatus getConnectionStatus={window.api?.settings?.getConnectionStatus} />
      <SettingsSync
        syncStatus={syncStatus}
        onSync={sync}
        isSyncing={isSyncing}
        settingsLabel="sorting"
      />
    </div>
  )
}

/**
 * Sorting tab content - sort settings with preview
 */
function SortingTabContent(): JSX.Element {
  const { sortOrder, setSortOrder } = useSortOrder()
  const { tabs } = useTabs()

  return (
    <SortSettings value={sortOrder} onChange={setSortOrder}>
      <div className="pt-4 border-t">
        <h3 className="text-xs font-medium text-muted-foreground mb-3">Preview</h3>
        <SortPreview tabs={tabs} />
      </div>
    </SortSettings>
  )
}

function SettingsContent(): JSX.Element {
  const { settings, updateSetting, isLoading, version } = useSettings<NativeSettingsType>()
  const [keyboard, setKeyboard] = useState<KeyboardSettingsType>(DEFAULT_KEYBOARD_SETTINGS)
  const [activeTab, setActiveTab] = useState<SettingsTab>(getInitialTab)

  // Listen for tab switch messages from main process
  useEffect(() => {
    if (window.api?.settings?.onSwitchTab) {
      window.api.settings.onSwitchTab((tab) => {
        setActiveTab(tab as SettingsTab)
      })
    }
  }, [])

  const handleKeyboardChange = (newKeyboard: KeyboardSettingsType): void => {
    setKeyboard(newKeyboard)
    // TODO: Save to electron store and update global shortcuts
    console.log('Keyboard settings changed:', newKeyboard)
  }

  if (isLoading || !settings) {
    return (
      <div className="w-full h-full bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  const tabs: SettingsTabConfig[] = [
    {
      id: 'about',
      label: 'About',
      icon: Info,
      content: <AboutSettings version={version || ''} />
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: Palette,
      content: (
        <div className="flex justify-center">
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="text-xs font-medium text-muted-foreground mb-3">Theme</h3>
            <ThemeSettings
              value={settings.theme}
              onChange={(theme) => updateSetting('theme', theme)}
            />
          </div>
        </div>
      )
    },
    {
      id: 'keys',
      label: 'Keys',
      icon: Keyboard,
      content: <KeyboardSettings keyboard={keyboard} onKeyboardChange={handleKeyboardChange} />
    },
    {
      id: 'connection',
      label: 'Connection',
      icon: Plug2,
      content: <ConnectionTabContent />
    },
    {
      id: 'options',
      label: 'Options',
      icon: SlidersHorizontal,
      content: (
        <NativeSettings
          getOptions={window.api?.options?.getAppOptions}
          setOption={window.api?.options?.setAppOption}
          checkForUpdates={window.api?.options?.checkForUpdates}
        />
      )
    },
    {
      id: 'sorting',
      label: 'Sorting',
      icon: ArrowUpDown,
      content: <SortingTabContent />
    }
  ]

  return (
    <SettingsLayout
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as SettingsTab)}
      containerClassName="w-full h-full bg-background"
      className="p-5"
    />
  )
}

function SettingsApp(): JSX.Element {
  return (
    <NativePlatformProvider>
      <SettingsContent />
    </NativePlatformProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsApp />
  </StrictMode>
)
