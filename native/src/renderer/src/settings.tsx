import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { KeyboardSettings, ThemeSettings, AboutSettings } from '@tas/components/settings'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tab-app-switcher/ui/components/tabs'
import { Info, Palette, Keyboard, SlidersHorizontal, Plug2, ListOrdered } from 'lucide-react'
import { DEFAULT_SHORTCUTS, KeyboardShortcuts } from '@tas/types/tabs'
import { NativeSettings } from './components/NativeSettings'
import { Setup } from './components/Setup'
import { SortSettingsPanel } from './components/SortSettingsPanel'
import './assets/globals.css'

// Tab values in alphabetical order
type SettingsTab = 'about' | 'appearance' | 'keys' | 'options' | 'setup' | 'sorting'

// Get initial tab from URL query parameter
function getInitialTab(): SettingsTab {
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab')
  if (tab === 'about') return 'about'
  if (tab === 'appearance') return 'appearance'
  if (tab === 'options') return 'options'
  if (tab === 'setup') return 'setup'
  if (tab === 'sorting') return 'sorting'
  return 'keys' // Default to keys
}

// Apply theme to document (defined outside component to avoid hooks dependency issues)
function applyTheme(newTheme: 'light' | 'dark' | 'system'): void {
  if (newTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else if (newTheme === 'light') {
    document.documentElement.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
}

// eslint-disable-next-line react-refresh/only-export-components
function SettingsApp(): JSX.Element {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>(DEFAULT_SHORTCUTS)
  const [activeTab, setActiveTab] = useState<SettingsTab>(getInitialTab)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [version, setVersion] = useState<string>('')

  // Load initial theme and version
  useEffect(() => {
    if (window.api?.options?.getAppOptions) {
      window.api.options.getAppOptions().then((opts) => {
        setTheme(opts.theme)
        applyTheme(opts.theme)
      })
    }
    if (window.api?.about?.getAboutInfo) {
      window.api.about.getAboutInfo().then((info) => {
        setVersion(info.version)
      })
    }
  }, [])

  // Listen for tab switch messages from main process
  useEffect(() => {
    if (window.api?.settings?.onSwitchTab) {
      window.api.settings.onSwitchTab((tab) => {
        setActiveTab(tab as SettingsTab)
      })
    }
  }, [])

  // Listen for theme changes from main process
  useEffect(() => {
    if (window.api?.options?.onThemeChanged) {
      window.api.options.onThemeChanged((newTheme) => {
        setTheme(newTheme)
        applyTheme(newTheme)
      })
    }
  }, [])

  const handleShortcutsChange = (newShortcuts: KeyboardShortcuts): void => {
    setShortcuts(newShortcuts)
    // TODO: Save to electron store and update global shortcuts
    console.log('Shortcuts changed:', newShortcuts)
  }

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system'): Promise<void> => {
    if (window.api?.options?.setAppOption) {
      await window.api.options.setAppOption('theme', newTheme)
    }
    setTheme(newTheme)
    applyTheme(newTheme)
  }

  const tabTriggerClass =
    'flex flex-col items-center gap-1 px-3 py-2 data-[state=active]:bg-muted rounded-lg text-muted-foreground data-[state=active]:text-foreground'

  return (
    <div className="w-full h-full bg-background p-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsTab)}>
        <TabsList className="w-full justify-center gap-1 mb-4 bg-transparent p-0 h-auto">
          <TabsTrigger value="about" className={tabTriggerClass}>
            <Info className="w-5 h-5" />
            <span className="text-xs">About</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className={tabTriggerClass}>
            <Palette className="w-5 h-5" />
            <span className="text-xs">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="keys" className={tabTriggerClass}>
            <Keyboard className="w-5 h-5" />
            <span className="text-xs">Keys</span>
          </TabsTrigger>
          <TabsTrigger value="options" className={tabTriggerClass}>
            <SlidersHorizontal className="w-5 h-5" />
            <span className="text-xs">Options</span>
          </TabsTrigger>
          <TabsTrigger value="setup" className={tabTriggerClass}>
            <Plug2 className="w-5 h-5" />
            <span className="text-xs">Setup</span>
          </TabsTrigger>
          <TabsTrigger value="sorting" className={tabTriggerClass}>
            <ListOrdered className="w-5 h-5" />
            <span className="text-xs">Sorting</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="mt-0">
          <AboutSettings version={version} />
        </TabsContent>

        <TabsContent value="appearance" className="mt-0">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Theme</h3>
              <ThemeSettings value={theme} onChange={handleThemeChange} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="keys" className="mt-0">
          <KeyboardSettings shortcuts={shortcuts} onShortcutsChange={handleShortcutsChange} />
        </TabsContent>

        <TabsContent value="options" className="mt-0">
          <NativeSettings
            getOptions={window.api?.options?.getAppOptions}
            setOption={window.api?.options?.setAppOption}
            checkForUpdates={window.api?.options?.checkForUpdates}
          />
        </TabsContent>

        <TabsContent value="setup" className="mt-0">
          <Setup getConnectionStatus={window.api?.settings?.getConnectionStatus} />
        </TabsContent>

        <TabsContent value="sorting" className="mt-0">
          <SortSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsApp />
  </StrictMode>
)
