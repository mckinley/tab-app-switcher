import { useState, useEffect } from "react"
import { KeyboardSettings, ThemeSettings, SortSettings, AboutSettings, SortOrder } from "@tas/components/settings"
import { DEFAULT_SHORTCUTS, KeyboardShortcuts } from "@tas/types/tabs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tab-app-switcher/ui/components/tabs"
import { Info, Palette, Keyboard, Download, ArrowUpDown } from "lucide-react"
import { ChromiumShortcutNote } from "../../components/ChromiumShortcutNote"
import { NativeStatus } from "../../components/NativeStatus"
import { SortPreview } from "../../components/SortPreview"
import { loadAndApplyTheme, saveTheme, getTheme, type Theme } from "../../utils/theme"
import "./globals.css"

// Tab values in alphabetical order
type SettingsTab = "about" | "appearance" | "keys" | "native" | "sorting"

function App() {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>(DEFAULT_SHORTCUTS)
  const [activeTab, setActiveTab] = useState<SettingsTab>("keys")
  const [theme, setTheme] = useState<Theme>("system")
  const [sortOrder, setSortOrder] = useState<SortOrder>("activated")
  const [version, setVersion] = useState<string>("")

  // Load initial settings
  useEffect(() => {
    loadAndApplyTheme()
    getTheme().then(setTheme)

    // Load shortcuts from storage
    browser.storage.local.get("shortcuts").then((result) => {
      if (result.shortcuts) {
        setShortcuts(result.shortcuts)
      }
    })

    // Load sort order from storage
    browser.storage.local.get("sortOrder").then((result) => {
      if (result.sortOrder) {
        setSortOrder(result.sortOrder)
      }
    })

    // Get extension version
    const manifest = browser.runtime.getManifest()
    setVersion(manifest.version || "")
  }, [])

  const handleShortcutsChange = (newShortcuts: KeyboardShortcuts) => {
    setShortcuts(newShortcuts)
    browser.storage.local.set({ shortcuts: newShortcuts })
  }

  const handleThemeChange = async (newTheme: Theme) => {
    setTheme(newTheme)
    await saveTheme(newTheme)
    loadAndApplyTheme()
  }

  const handleSortOrderChange = (newOrder: SortOrder) => {
    setSortOrder(newOrder)
    browser.storage.local.set({ sortOrder: newOrder })
  }

  const tabTriggerClass =
    "flex flex-col items-center gap-1 px-3 py-2 data-[state=active]:bg-muted rounded-lg text-muted-foreground data-[state=active]:text-foreground"

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl py-8 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Tab Application Switcher</h1>
          <p className="text-sm text-muted-foreground">Configure your extension settings</p>
        </div>

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
            <TabsTrigger value="native" className={tabTriggerClass}>
              <Download className="w-5 h-5" />
              <span className="text-xs">Native</span>
            </TabsTrigger>
            <TabsTrigger value="sorting" className={tabTriggerClass}>
              <ArrowUpDown className="w-5 h-5" />
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

          <TabsContent value="keys" className="mt-0 space-y-6">
            <ChromiumShortcutNote />
            <KeyboardSettings shortcuts={shortcuts} onShortcutsChange={handleShortcutsChange} />
          </TabsContent>

          <TabsContent value="native" className="mt-0">
            <NativeStatus />
          </TabsContent>

          <TabsContent value="sorting" className="mt-0">
            <SortSettings value={sortOrder} onChange={handleSortOrderChange}>
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium mb-3">Preview</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  This shows how your tabs will be sorted with the current settings
                </p>
                <SortPreview />
              </div>
            </SortSettings>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App
