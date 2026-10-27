import { useState, useCallback, useRef } from "react"
import type { Tab } from "../types/tabs"

/**
 * Hook for managing tab navigation state in switcher UIs
 *
 * Provides:
 * - Selected index state (starts at 1 for "previous tab" behavior)
 * - Navigate function for next/prev movement with wrapping
 * - Reset function to return to initial state
 * - The tabs the switcher shows (after search), for acting on the selection
 *
 * selectedIndex counts rows as TabSwitcher shows them. Pass onVisibleTabsChange to
 * TabSwitcher so navigation and visibleTabs follow its search; without it they use `tabs`.
 *
 * @example
 * const { selectedIndex, navigate, reset, visibleTabs, onVisibleTabsChange } = useTabNavigation(tabs)
 * // Navigate with keyboard
 * navigate('next')
 * // Act on the selection
 * activate(visibleTabs[selectedIndex])
 * // Reset when overlay reopens
 * reset()
 */
export function useTabNavigation(tabs: Tab[]) {
  // Start with second tab (index 1) for "switch to previous" behavior
  const [selectedIndex, setSelectedIndexState] = useState(1)
  // Mirrors selectedIndex so navigate() can return the new index right away
  const selectedIndexRef = useRef(1)
  // The rows TabSwitcher shows, once it has reported them
  const [reportedTabs, setReportedTabs] = useState<Tab[] | null>(null)
  const searchQueryRef = useRef("")

  const visibleTabs = reportedTabs ?? tabs

  const setSelectedIndex = useCallback((index: number) => {
    selectedIndexRef.current = index
    setSelectedIndexState(index)
  }, [])

  /** Move the selection one step, wrapping around, and return the new index. */
  const navigate = useCallback(
    (direction: "next" | "prev"): number => {
      const count = visibleTabs.length
      if (count === 0) return selectedIndexRef.current
      const prev = Math.min(selectedIndexRef.current, count - 1)
      const next = direction === "next" ? (prev + 1) % count : prev === 0 ? count - 1 : prev - 1
      setSelectedIndex(next)
      return next
    },
    [visibleTabs.length, setSelectedIndex],
  )

  const reset = useCallback(() => {
    // Reset to second tab if available, otherwise first
    setSelectedIndex(visibleTabs.length > 1 ? 1 : 0)
  }, [visibleTabs.length, setSelectedIndex])

  /** TabSwitcher calls this with the rows it shows; a new search selects the first match. */
  const onVisibleTabsChange = useCallback(
    (shown: Tab[], searchQuery: string) => {
      // Keep the old array when nothing changed, so a parent that rebuilds its tab array on
      // every render doesn't re-render forever
      setReportedTabs((current) =>
        current?.length === shown.length && current.every((tab, i) => tab === shown[i]) ? current : shown,
      )
      if (searchQuery !== searchQueryRef.current) {
        searchQueryRef.current = searchQuery
        setSelectedIndex(searchQuery || shown.length < 2 ? 0 : 1)
      }
    },
    [setSelectedIndex],
  )

  return {
    selectedIndex,
    setSelectedIndex,
    navigate,
    reset,
    visibleTabs,
    onVisibleTabsChange,
  }
}
