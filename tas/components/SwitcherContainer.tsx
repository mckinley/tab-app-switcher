/**
 * SwitcherContainer - Container component for the tab switcher UI
 *
 * Handles layout, sizing, and escape key to close.
 * Used by extension popup, tabs page, and native overlay.
 */
import type { ReactNode } from "react"
import { cn } from "@tab-app-switcher/ui/lib/utils"
import { useEscapeKey } from "../lib/platform"

export interface SwitcherContainerProps {
  children: ReactNode
  /**
   * Layout variant:
   * - 'fill': Fills parent container (e.g., popup window, native overlay)
   * - 'screen': Full screen height (e.g., tabs page, options page)
   */
  variant: "fill" | "screen"
  /** Callback when escape is pressed (or close is requested) */
  onClose?: () => void
  /** Whether escape key handling is enabled (default: true) */
  enabled?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Container for tab switcher UI with escape key handling
 */
export function SwitcherContainer({
  children,
  variant,
  onClose,
  enabled = true,
  className,
}: SwitcherContainerProps): JSX.Element {
  // Handle escape key to close
  useEscapeKey(onClose, enabled)

  return (
    <div
      className={cn(
        // Common styles
        "bg-[hsl(var(--switcher-bg))] rounded-xl",
        "shadow-[0_8px_32px_-8px_hsl(var(--switcher-shadow))]",
        "border border-border/50",
        "flex flex-col overflow-hidden",

        // Variant-specific sizing
        variant === "fill" && "w-full h-full",
        variant === "screen" && "h-screen bg-background",

        className,
      )}
    >
      {children}
    </div>
  )
}
