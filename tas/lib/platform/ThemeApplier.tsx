/**
 * ThemeApplier Component
 *
 * Applies theme from settings context to the document.
 * Should be used inside a PlatformProvider.
 */

import type { ReactNode } from "react"
import { useApplyTheme } from "./hooks"

interface ThemeApplierProps {
  children: ReactNode
}

/**
 * Wrapper component that applies theme and renders children.
 * Must be used within a PlatformProvider context.
 */
export function ThemeApplier({ children }: ThemeApplierProps): JSX.Element {
  useApplyTheme()
  return <>{children}</>
}
