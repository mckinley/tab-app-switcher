import { useState, useCallback } from "react"
import type { Tab } from "../types/tabs"

/**
 * Hook for managing tab navigation state in switcher UIs
 *
 * Provides:
 * - Selected index state (starts at 1 for "previous tab" behavior)
 * - Navigate function for next/prev movement with wrapping
 * - Reset function to return to initial state
 *
 * @example
 * const { selectedIndex, navigate, reset } = useTabNavigation(tabs)
 * // Navigate with keyboard
 * navigate('next')
 * // Reset when overlay reopens
 * reset()
 */
export function useTabNavigation(tabs: Tab[]) {
  // Start with second tab (index 1) for "switch to previous" behavior
  const [selectedIndex, setSelectedIndex] = useState(1)

  const navigate = useCallback(
    (direction: "next" | "prev") => {
      setSelectedIndex((prev) => {
        if (tabs.length === 0) return prev
        return direction === "next" ? (prev + 1) % tabs.length : prev === 0 ? tabs.length - 1 : prev - 1
      })
    },
    [tabs.length],
  )

  const reset = useCallback(() => {
    // Reset to second tab if available, otherwise first
    setSelectedIndex(tabs.length > 1 ? 1 : 0)
  }, [tabs.length])

  return {
    selectedIndex,
    setSelectedIndex,
    navigate,
    reset,
  }
}
