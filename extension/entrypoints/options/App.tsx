import { useState } from "react"
import {
  KeyboardSettings,
  ThemeSettings,
  AboutSettings,
  SettingsLayout,
  ExtensionConnectionStatus,
  ExtensionKeyboardNotes,
  SortSettings,
  SortPreview,
  type SettingsTabConfig,
} from "@tas/components/settings"
import { Info, Palette, Keyboard, Plug2, ArrowUpDown } from "lucide-react"
import {
  ExtensionPlatformProvider,
  useSettings,
  useApplyTheme,
  useNativeConnection,
  useBrowser,
  useSortOrder,
  useTabs,
} from "../../lib/platform"
import type { ExtensionSettings } from "@tas/lib/settings"
import "./globals.css"

// Tab values in alphabetical order
type SettingsTab = "about" | "appearance" | "connection" | "keys" | "sorting"

/**
 * Keys tab content - uses browser hook for shortcut note
 */
function KeysTabContent({
  keyboard,
  onKeyboardChange,
}: {
  keyboard: ExtensionSettings["keyboard"]
  onKeyboardChange: (keyboard: ExtensionSettings["keyboard"]) => void
}) {
  const { browserType, openShortcutsPage } = useBrowser()

  return (
    <div className="space-y-6">
      <ExtensionKeyboardNotes browserType={browserType} onOpenShortcuts={openShortcutsPage} />
      <KeyboardSettings keyboard={keyboard} onKeyboardChange={onKeyboardChange} />
    </div>
  )
}

/**
 * Connection tab content - uses native connection hook
 */
function ConnectionTabContent() {
  const { isConnected, downloadUrl } = useNativeConnection()

  return <ExtensionConnectionStatus isConnected={isConnected} downloadUrl={downloadUrl} />
}

/**
 * Sorting tab content - sort settings with preview
 */
function SortingTabContent() {
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

function SettingsContent() {
  const { settings, updateSetting, isLoading, version } = useSettings<ExtensionSettings>()
  const [activeTab, setActiveTab] = useState<SettingsTab>("about")

  // Apply theme from settings
  useApplyTheme()

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  const tabs: SettingsTabConfig[] = [
    {
      id: "about",
      label: "About",
      icon: Info,
      content: <AboutSettings version={version || ""} />,
    },
    {
      id: "appearance",
      label: "Appearance",
      icon: Palette,
      content: (
        <div className="flex justify-center">
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="text-xs font-medium text-muted-foreground mb-3">Theme</h3>
            <ThemeSettings value={settings.theme} onChange={(theme) => updateSetting("theme", theme)} />
          </div>
        </div>
      ),
    },
    {
      id: "keys",
      label: "Keys",
      icon: Keyboard,
      content: (
        <KeysTabContent
          keyboard={settings.keyboard}
          onKeyboardChange={(keyboard) => updateSetting("keyboard", keyboard)}
        />
      ),
    },
    {
      id: "connection",
      label: "Connection",
      icon: Plug2,
      content: <ConnectionTabContent />,
    },
    {
      id: "sorting",
      label: "Sorting",
      icon: ArrowUpDown,
      content: <SortingTabContent />,
    },
  ]

  return (
    <div className="min-h-screen bg-muted/30 flex items-start justify-center pt-8 pb-8 px-4">
      <div className="w-full max-w-xl min-h-[420px] bg-background border rounded-lg shadow-sm">
        <SettingsLayout
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as SettingsTab)}
          showHeader
          title="Tab Application Switcher"
          description="Extension Settings"
          className="p-6"
        />
      </div>
    </div>
  )
}

function App() {
  return (
    <ExtensionPlatformProvider>
      <SettingsContent />
    </ExtensionPlatformProvider>
  )
}

export default App
