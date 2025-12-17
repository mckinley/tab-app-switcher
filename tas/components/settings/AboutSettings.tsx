import { ExternalLink } from "lucide-react"

interface AboutSettingsProps {
  version?: string
}

export const AboutSettings = ({ version }: AboutSettingsProps) => {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">TAS</h2>
        <p className="text-sm text-muted-foreground">Tab Application Switcher</p>
        {version && <p className="text-xs text-muted-foreground">Version {version}</p>}
      </div>

      <div className="space-y-3 pt-4 border-t">
        <a
          href="https://tabappswitcher.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
        >
          Visit tabappswitcher.com
          <ExternalLink className="w-3 h-3" />
        </a>

        <a
          href="https://tabappswitcher.com/getting-started"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Getting Started Guide
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}
