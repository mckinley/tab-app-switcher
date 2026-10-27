import { useState, useCallback, useRef } from "react"
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
  const [selectedIndex, setSelectedIndexState] = useState(1)
  // Mirrors selectedIndex so navigate() can return the new index right away
  const selectedIndexRef = useRef(1)

  const setSelectedIndex = useCallback((index: number) => {
    selectedIndexRef.current = index
    setSelectedIndexState(index)
  }, [])

  /** Move the selection one step, wrapping around, and return the new index. */
  const navigate = useCallback(
    (direction: "next" | "prev"): number => {
      if (tabs.length === 0) return selectedIndexRef.current
      const prev = Math.min(selectedIndexRef.current, tabs.length - 1)
      const next = direction === "next" ? (prev + 1) % tabs.length : prev === 0 ? tabs.length - 1 : prev - 1
      setSelectedIndex(next)
      return next
    },
    [tabs.length, setSelectedIndex],
  )

  const reset = useCallback(() => {
    // Reset to second tab if available, otherwise first
    setSelectedIndex(tabs.length > 1 ? 1 : 0)
  }, [tabs.length, setSelectedIndex])

  return {
    selectedIndex,
    setSelectedIndex,
    navigate,
    reset,
  }
}
