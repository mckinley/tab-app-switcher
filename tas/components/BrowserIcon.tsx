import { BrowserType } from "../types/tabs"
import { cn } from "../lib/utils"

interface BrowserIconProps {
  browser: BrowserType
  className?: string
}

// SVG icons for each browser
const browserIcons: Record<BrowserType, React.ReactNode> = {
  chrome: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8L21 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7.5 14.5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16.5 14.5L12 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  firefox: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8C8 8 10 6 14 8C18 10 16 14 16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 12C10 12 11 14 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  edge: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M2 12C2 12 6 10 12 12C18 14 18 18 14 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  safari: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 8L10 14L8 16L14 10L16 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 4V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 18V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 12H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 12H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  unknown: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
}

export const BrowserIcon = ({ browser, className }: BrowserIconProps) => {
  return <div className={cn("text-muted-foreground", className)}>{browserIcons[browser]}</div>
}
