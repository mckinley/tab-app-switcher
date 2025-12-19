import { Sun, Moon, Monitor } from "lucide-react"
import { cn } from "@tab-app-switcher/ui/lib/utils"

type Theme = "light" | "dark" | "system"

interface ThemeSettingsProps {
  value: Theme
  onChange: (theme: Theme) => void
}

export const ThemeSettings = ({ value, onChange }: ThemeSettingsProps) => {
  const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ]

  return (
    <div className="inline-flex rounded-lg border bg-muted/30 p-0.5">
      {themes.map((theme) => {
        const Icon = theme.icon
        const isSelected = value === theme.value
        return (
          <button
            key={theme.value}
            type="button"
            onClick={() => onChange(theme.value)}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 text-sm rounded-md transition-colors",
              isSelected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="w-4 h-4" />
            {theme.label}
          </button>
        )
      })}
    </div>
  )
}
