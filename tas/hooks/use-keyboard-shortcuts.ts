import { useEffect } from 'react';
import { KeyboardShortcuts } from '../types/tabs';
import { getKeyCode } from '../utils/keyCodeMapping';
import { createLogger } from '../utils/logger';

const logger = createLogger('use-keyboard-shortcuts');

/**
 * Options for the useKeyboardShortcuts hook
 */
export interface UseKeyboardShortcutsOptions {
  /** Whether keyboard shortcuts are enabled */
  enabled: boolean;
  /** Keyboard shortcut configuration */
  shortcuts: KeyboardShortcuts;
  /** Whether the search input is currently focused */
  isSearchFocused: boolean;
  /** Whether the settings dialog is currently open */
  isSettingsOpen: boolean;
  /** Whether the tab management panel is currently open */
  isTabManagementOpen: boolean;
  /** Callback when navigating to the next item */
  onNavigateNext: () => void;
  /** Callback when navigating to the previous item */
  onNavigatePrev: () => void;
  /** Callback when activating the selected item */
  onActivateSelected: () => void;
  /** Callback when closing the switcher */
  onClose: () => void;
  /** Callback when focusing the search input */
  onFocusSearch: () => void;
  /** Callback when blurring the search input */
  onBlurSearch: () => void;
  /** Callback when closing a tab */
  onCloseTab: () => void;
}

/**
 * Custom hook for handling keyboard shortcuts in the TabSwitcher
 *
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
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      logger.log('Key down:', e.key, 'Code:', e.code);
      // Don't handle ANY keys when settings dialog or tab management panel is open
      if (isSettingsOpen || isTabManagementOpen) return;

      // Search key to focus search (works even with modifier held)
      // Use e.code to detect physical key, not the character it produces
      if (e.code === getKeyCode(shortcuts.search) && !isSearchFocused) {
        e.preventDefault();
        e.stopPropagation();
        onFocusSearch();
        return;
      }

      // If search is focused, allow normal typing except for Escape
      if (isSearchFocused) {
        if (e.key === "Escape") {
          e.preventDefault();
          onBlurSearch();
        }
        return;
      }

      // Check if modifier key is pressed
      const isModifierPressed = checkModifierKeyPressed(e, shortcuts.modifier);

      // Modifier+ActivateBackward to navigate backward
      // Use e.code to detect backtick key regardless of what character it produces
      if (isModifierPressed && e.code === getKeyCode(shortcuts.activateBackward)) {
        e.preventDefault();
        onNavigatePrev();
        return;
      }

      // Modifier+CloseTab to close tab
      // Use e.code to detect W key regardless of what character it produces (e.g., ∑ on macOS)
      if (isModifierPressed && e.code === getKeyCode(shortcuts.closeTab)) {
        e.preventDefault();
        onCloseTab();
        return;
      }

      // Handle non-modifier shortcuts
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          onNavigateNext();
          break;
        case "ArrowUp":
          e.preventDefault();
          onNavigatePrev();
          break;
        case "Enter":
          e.preventDefault();
          onActivateSelected();
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      logger.log('Key up:', e.key, 'Code:', e.code);
      // Don't handle when settings dialog or tab management panel is open
      if (isSettingsOpen || isTabManagementOpen) return;

      // Don't activate tab if search is focused (user might be typing)
      if (isSearchFocused) return;

      // Detect modifier key release
      if (checkModifierKeyRelease(e, shortcuts.modifier)) {
        onActivateSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
    };
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
  ]);
}

/**
 * Check if the specified modifier key is currently pressed
 *
 * @param e - The keyboard event
 * @param modifier - The modifier key name ('Alt', 'Cmd', 'Ctrl', or 'Shift')
 * @returns True if the modifier key is pressed
 */
function checkModifierKeyPressed(e: KeyboardEvent, modifier: string): boolean {
  switch (modifier) {
    case "Alt":
      return e.altKey;
    case "Cmd":
      return e.metaKey;
    case "Ctrl":
      return e.ctrlKey;
    case "Shift":
      return e.shiftKey;
    default:
      return false;
  }
}

/**
 * Check if the specified modifier key was just released
 *
 * @param e - The keyboard event
 * @param modifier - The modifier key name ('Alt', 'Cmd', 'Ctrl', or 'Shift')
 * @returns True if the modifier key was released
 */
function checkModifierKeyRelease(e: KeyboardEvent, modifier: string): boolean {
  return (
    e.key === modifier ||
    (modifier === "Cmd" && e.key === "Meta") ||
    (modifier === "Ctrl" && e.key === "Control") ||
    (modifier === "Alt" && e.key === "Alt")
  );
}

