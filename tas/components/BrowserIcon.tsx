import { SiGooglechrome, SiFirefox, SiSafari } from "@icons-pack/react-simple-icons"
import { Globe } from "lucide-react"
import { BrowserType } from "../types/tabs"
import { cn } from "../lib/utils"

interface BrowserIconProps {
  browser: BrowserType
  className?: string
}

// Microsoft Edge icon (Simple Icons removed Microsoft icons due to trademark issues)
const EdgeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M21.86 17.86q.14 0 .25.12.1.13.1.25t-.11.33l-.32.46-.43.53-.44.5q-.21.25-.38.42l-.22.23q-.58.53-1.34 1.04-.76.51-1.6.91-.86.4-1.74.64t-1.67.24q-.9 0-1.69-.28-.8-.28-1.48-.78-.68-.5-1.22-1.17-.53-.66-.92-1.44-.38-.77-.58-1.6-.2-.83-.2-1.67 0-1 .32-1.96.33-.97.87-1.8.14.95.55 1.77.41.81 1.02 1.49.6.68 1.38 1.21.78.54 1.64.9.86.36 1.77.56.92.2 1.8.2 1.12 0 2.18-.24 1.06-.23 2.06-.72l.2-.1.2-.05zm-15.5-1.27q0 1.1.27 2.15.27 1.06.78 2.03.51.96 1.24 1.77.74.82 1.66 1.4-1.47-.2-2.8-.74-1.33-.55-2.48-1.37-1.15-.83-2.08-1.9-.92-1.07-1.58-2.33T.36 14.94Q0 13.54 0 12.06q0-.81.32-1.49.31-.68.83-1.23.53-.55 1.2-.96.66-.4 1.35-.66.69-.27 1.36-.39.68-.12 1.26-.12.18 0 .43.02.26.02.6.08.33.05.7.15.38.1.76.26.39.15.77.38.39.22.73.52.35.3.63.7.29.4.47.9-1.27.88-2.16 2.18-.9 1.3-1.3 2.93-.07.28-.1.55-.04.28-.04.58zm12.79-8.6q.1.02.17.06.08.05.08.14 0 .07-.05.13-.05.05-.14.05-.54 0-1.11.09-.58.1-1.14.29-.55.2-1.08.48-.52.28-.97.65-.46.37-.83.82-.38.46-.64.99-.26.52-.4 1.1-.13.57-.13 1.18 0 .34.05.77.05.44.18.9.12.47.33.93.22.47.53.88.32.42.74.76.42.35.96.58-.77-.27-1.47-.66-.7-.4-1.3-.9-.6-.5-1.08-1.1-.49-.6-.84-1.27-.35-.66-.56-1.38-.2-.71-.2-1.45 0-.9.27-1.75.28-.84.77-1.58.5-.73 1.18-1.32.68-.6 1.5-1.01.82-.42 1.74-.64.93-.22 1.9-.22.25 0 .48.02.22.02.48.06.25.04.53.1.27.07.58.17z" />
  </svg>
)

export const BrowserIcon = ({ browser, className }: BrowserIconProps) => {
  const iconClass = cn("text-muted-foreground", className)

  switch (browser) {
    case "chrome":
      return <SiGooglechrome className={iconClass} />
    case "firefox":
      return <SiFirefox className={iconClass} />
    case "edge":
      return <EdgeIcon className={iconClass} />
    case "safari":
      return <SiSafari className={iconClass} />
    default:
      return <Globe className={iconClass} />
  }
}
