import { Button } from "@tab-app-switcher/ui/components/button"
import { Sun, Moon, Monitor } from "lucide-react"

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
    <div className="space-y-3">
      <div className="flex gap-2">
        {themes.map((theme) => {
          const Icon = theme.icon
          return (
            <Button
              key={theme.value}
              variant={value === theme.value ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(theme.value)}
              className="flex-1 gap-2"
            >
              <Icon className="w-4 h-4" />
              {theme.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
