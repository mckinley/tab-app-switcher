import { useEffect } from "react"
import { KeyboardShortcuts } from "../types/tabs"
import { getKeyCode } from "../utils/keyCodeMapping"
import { createLogger } from "../utils/logger"
import {
  isModifierPressed,
  isModifierRelease,
  getShortcutBindings,
  type TasAction,
} from "../keyboard"

const logger = createLogger("use-keyboard-shortcuts")

/**
 * Options for the useKeyboardShortcuts hook
 */
export interface UseKeyboardShortcutsOptions {
  /** Whether keyboard shortcuts are enabled */
  enabled: boolean
  /** Keyboard shortcut configuration */
  shortcuts: KeyboardShortcuts
  /** Whether the search input is currently focused */
  isSearchFocused: boolean
  /** Whether the settings dialog is currently open */
  isSettingsOpen: boolean
  /** Whether the tab management panel is currently open */
  isTabManagementOpen: boolean
  /** Callback when navigating to the next item */
  onNavigateNext: () => void
  /** Callback when navigating to the previous item */
  onNavigatePrev: () => void
  /** Callback when activating the selected item */
  onActivateSelected: () => void
  /** Callback when closing the switcher */
  onClose: () => void
  /** Callback when focusing the search input */
  onFocusSearch: () => void
  /** Callback when blurring the search input */
  onBlurSearch: () => void
  /** Callback when closing a tab */
  onCloseTab: () => void
}

/**
 * Custom hook for handling keyboard shortcuts in the TabSwitcher
 *
 * Uses shared shortcut bindings from tas/keyboard for consistency with native app.
 * Handles both keydown and keyup events with proper modifier detection.
 * Uses e.code instead of e.key to handle macOS Option key special characters.
 *
 * @example
 * useKeyboardShortcuts({
 *   enabled: isVisible,
 *   shortcuts: { modifier: 'Alt', activateForward: 'Tab', ... },
 *   isSearchFocused: false,
 *   isSettingsOpen: false,
 *   isTabManagementOpen: false,
 *   onNavigateNext: () => handleNavigate('next'),
 *   onNavigatePrev: () => handleNavigate('prev'),
 *   onActivateSelected: () => activateTab(selectedTab.id),
 *   onClose: () => setVisible(false),
 *   onFocusSearch: () => searchRef.current?.focus(),
 *   onBlurSearch: () => searchRef.current?.blur(),
 *   onCloseTab: () => closeTab(selectedTab.id),
 * });
 */
export function useKeyboardShortcuts({
  enabled,
  shortcuts,
  isSearchFocused,
  isSettingsOpen,
  isTabManagementOpen,
  onNavigateNext,
  onNavigatePrev,
  onActivateSelected,
  onClose,
  onFocusSearch,
  onBlurSearch,
  onCloseTab,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return

    /**
     * Execute a TAS action by calling the appropriate callback
     */
    const executeAction = (action: TasAction): void => {
      switch (action) {
        case "navigateNext":
          onNavigateNext()
          break
        case "navigatePrev":
          onNavigatePrev()
          break
        case "activateSelected":
          onActivateSelected()
          break
        case "closeSelectedTab":
          onCloseTab()
          break
        case "dismiss":
          onClose()
          break
        case "focusSearch":
          onFocusSearch()
          break
        case "blurSearch":
          onBlurSearch()
          break
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      logger.log("Key down:", e.key, "Code:", e.code)

      // Don't handle ANY keys when settings dialog or tab management panel is open
      if (isSettingsOpen || isTabManagementOpen) return

      // If search is focused, only handle Escape to exit
      if (isSearchFocused) {
        if (e.key === "Escape") {
          e.preventDefault()
          onBlurSearch()
        }
        return
      }

      // Get bindings and check modifier state using shared utilities
      const bindings = getShortcutBindings(shortcuts)
      const primaryModifierPressed = isModifierPressed(
        shortcuts.modifier,
        e.altKey,
        e.metaKey,
        e.ctrlKey,
        e.shiftKey,
      )

      // Match against all bindings (data-driven approach)
      for (const binding of bindings) {
        // Check primary modifier requirement
        if (binding.withModifier !== primaryModifierPressed) continue

        // Check shift requirement (if specified in the binding)
        if (binding.withShift !== undefined && binding.withShift !== e.shiftKey) continue

        // Check key match using e.code for physical key detection (handles macOS Option key)
        // Also fall back to e.key for special keys like Enter, Escape, Arrow keys
        const keyMatches = e.code === getKeyCode(binding.key) || e.key === binding.key
        if (!keyMatches) continue

        // Match found - execute action
        e.preventDefault()
        e.stopPropagation()
        executeAction(binding.action)
        return
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      logger.log("Key up:", e.key, "Code:", e.code)

      // Don't handle when settings dialog or tab management panel is open
      if (isSettingsOpen || isTabManagementOpen) return

      // Don't activate tab if search is focused (user might be typing)
      if (isSearchFocused) return

      // Detect modifier key release using shared utility
      if (isModifierRelease(e.key, shortcuts.modifier)) {
        onActivateSelected()
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true })
    window.addEventListener("keyup", handleKeyUp, { capture: true })

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true })
      window.removeEventListener("keyup", handleKeyUp, { capture: true })
    }
  }, [
    enabled,
    shortcuts,
    isSearchFocused,
    isSettingsOpen,
    isTabManagementOpen,
    onNavigateNext,
    onNavigatePrev,
    onActivateSelected,
    onClose,
    onFocusSearch,
    onBlurSearch,
    onCloseTab,
  ])
}
