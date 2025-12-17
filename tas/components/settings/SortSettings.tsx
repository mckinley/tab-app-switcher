import { Label } from "@tab-app-switcher/ui/components/label"
import { cn } from "@tab-app-switcher/ui/lib/utils"

export type SortOrder = "activated" | "activated-by-window" | "accessed" | "deactivated"

interface SortSettingsProps {
  value: SortOrder
  onChange: (order: SortOrder) => void
  children?: React.ReactNode // For timing comparison or other debug views
}

const sortOptions: { value: SortOrder; label: string; description: string }[] = [
  {
    value: "activated",
    label: "Activated",
    description: "Sort by when tabs were last activated (TAS MRU)",
  },
  {
    value: "activated-by-window",
    label: "Activated by Window",
    description: "Group tabs by window, then sort by activation",
  },
  {
    value: "accessed",
    label: "Accessed",
    description: "Sort by Chrome's lastAccessed timestamp",
  },
  {
    value: "deactivated",
    label: "Deactivated",
    description: "Sort by when tabs lost focus",
  },
]

export const SortSettings = ({ value, onChange, children }: SortSettingsProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Sort Order</Label>
        <div className="space-y-2">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                value === option.value ? "border-primary bg-primary/5" : "hover:bg-muted/50",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                  value === option.value ? "border-primary" : "border-muted-foreground",
                )}
              >
                {value === option.value && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {children && <div className="pt-4 border-t">{children}</div>}
    </div>
  )
}
