/**
 * SettingsLayout - Shared layout for settings pages
 * Provides consistent tab navigation across extension and native
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tab-app-switcher/ui/components/tabs"
import { type LucideIcon } from "lucide-react"

export interface SettingsTabConfig {
  /** Unique identifier for the tab */
  id: string
  /** Display label for the tab */
  label: string
  /** Icon component from lucide-react */
  icon: LucideIcon
  /** Content to render when tab is active */
  content: React.ReactNode
}

export interface SettingsLayoutProps {
  /** Tab configurations */
  tabs: SettingsTabConfig[]
  /** Currently active tab id */
  activeTab: string
  /** Callback when tab changes */
  onTabChange: (tab: string) => void
  /** Optional header title */
  title?: string
  /** Optional header description */
  description?: string
  /** Whether to show the header (default: false) */
  showHeader?: boolean
  /** Additional CSS classes for the tabs container */
  className?: string
  /** Additional CSS classes for the outer container */
  containerClassName?: string
}

const TAB_TRIGGER_CLASS =
  "flex flex-col items-center gap-1 px-3 py-2 data-[state=active]:bg-muted rounded-lg text-muted-foreground data-[state=active]:text-foreground"

export function SettingsLayout({
  tabs,
  activeTab,
  onTabChange,
  title = "Settings",
  description,
  showHeader = false,
  className,
  containerClassName,
}: SettingsLayoutProps) {
  return (
    <div className={containerClassName}>
      {showHeader && (
        <div className="h-10 flex items-center justify-center border-b mb-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{title}</span>
            {description && <span> — {description}</span>}
          </p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={onTabChange} className={className}>
        <TabsList className="w-full justify-center gap-1 mb-6 bg-transparent p-0 h-auto">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className={TAB_TRIGGER_CLASS}>
              <tab.icon className="w-5 h-5" />
              <span className="text-xs">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-0">
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
