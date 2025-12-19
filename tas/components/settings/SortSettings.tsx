import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@tab-app-switcher/ui/components/select"
import type { SortOrder } from "@tas/sorting"

export type { SortOrder }

interface SortSettingsProps {
  value: SortOrder
  onChange: (order: SortOrder) => void
  children?: React.ReactNode // For preview section
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
  const selectedOption = sortOptions.find((o) => o.value === value)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Sort Order</label>
        <Select value={value} onValueChange={(v) => onChange(v as SortOrder)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select sort order" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedOption && <p className="text-xs text-muted-foreground">{selectedOption.description}</p>}
      </div>

      {children}
    </div>
  )
}
