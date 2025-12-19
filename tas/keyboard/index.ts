/**
 * TAS Keyboard Actions & Behaviors
 *
 * Defines all keyboard-triggered actions in TAS and how key bindings map to them.
 * This is the single source of truth for keyboard behavior, used by both
 * the browser extension and native app implementations.
 */

import { KeyboardSettings, DEFAULT_KEYBOARD_SETTINGS } from "../types/tabs"

/**
 * All possible keyboard-triggered actions in TAS
 */
export type TasAction =
  | "navigateNext" // Move selection to next tab
  | "navigatePrev" // Move selection to previous tab
  | "activateSelected" // Activate the selected tab and close overlay
  | "closeSelectedTab" // Close the currently selected tab (keep overlay open)
  | "dismiss" // Close overlay without activating any tab
  | "focusSearch" // Focus the search input
  | "blurSearch" // Blur/exit the search input

/**
 * A keyboard key binding
 */
export interface KeyBinding {
  /** The key (e.g., "Tab", "Escape", "ArrowUp", "W") */
  key: string
  /** Whether the modifier key (Alt/Cmd/Ctrl) must be held */
  withModifier: boolean
  /** Whether Shift must also be held */
  withShift?: boolean
  /** The action to trigger */
  action: TasAction
}

/**
 * Special trigger: modifier key release
 * When the modifier key is released (while overlay is visible), activate selected tab
 */
export const MODIFIER_RELEASE_ACTION: TasAction = "activateSelected"

/**
 * Build the complete list of key bindings from user settings
 *
 * @param keyboard - User's keyboard configuration
 * @returns Array of all key bindings
 */
export function getKeyBindings(keyboard: KeyboardSettings = DEFAULT_KEYBOARD_SETTINGS): KeyBinding[] {
  return [
    // === Modifier + Key combinations ===
    // Navigation while holding modifier
    { key: keyboard.activateForward, withModifier: true, action: "navigateNext" },
    { key: keyboard.activateForward, withModifier: true, withShift: true, action: "navigatePrev" },
    { key: keyboard.activateBackward, withModifier: true, action: "navigatePrev" },

    // Tab management while holding modifier
    { key: keyboard.closeTab, withModifier: true, action: "closeSelectedTab" },
    { key: keyboard.search, withModifier: true, action: "focusSearch" },

    // Activation with modifier
    { key: "Enter", withModifier: true, action: "activateSelected" },
    { key: "Return", withModifier: true, action: "activateSelected" },

    // Dismiss with modifier
    { key: "Escape", withModifier: true, action: "dismiss" },

    // === Non-modifier key bindings ===
    // Arrow navigation (works with or without modifier)
    { key: "ArrowUp", withModifier: false, action: "navigatePrev" },
    { key: "ArrowDown", withModifier: false, action: "navigateNext" },
    { key: "ArrowUp", withModifier: true, action: "navigatePrev" },
    { key: "ArrowDown", withModifier: true, action: "navigateNext" },

    // Activation without modifier (for after releasing modifier)
    { key: "Enter", withModifier: false, action: "activateSelected" },
    { key: "Return", withModifier: false, action: "activateSelected" },

    // Dismiss without modifier
    { key: "Escape", withModifier: false, action: "dismiss" },
  ]
}

/**
 * Modifier key types supported by TAS
 */
export type ModifierKey = "Alt" | "Cmd" | "Ctrl" | "Shift"

/**
 * Check if a modifier key matches an event's modifier state
 *
 * @param modifier - The modifier key name
 * @param altKey - Event's altKey state
 * @param metaKey - Event's metaKey state
 * @param ctrlKey - Event's ctrlKey state
 * @param shiftKey - Event's shiftKey state
 * @returns True if the modifier is pressed
 */
export function isModifierPressed(
  modifier: string,
  altKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
  shiftKey: boolean,
): boolean {
  switch (modifier) {
    case "Alt":
      return altKey
    case "Cmd":
      return metaKey
    case "Ctrl":
      return ctrlKey
    case "Shift":
      return shiftKey
    default:
      return false
  }
}

/**
 * Check if a key event represents a modifier key release
 *
 * @param key - The event's key property
 * @param modifier - The configured modifier key
 * @returns True if this is the modifier being released
 */
export function isModifierRelease(key: string, modifier: string): boolean {
  return (
    key === modifier ||
    (modifier === "Cmd" && key === "Meta") ||
    (modifier === "Ctrl" && key === "Control") ||
    (modifier === "Alt" && key === "Alt")
  )
}

// Re-export types for convenience
export type { KeyboardSettings } from "../types/tabs"
export { DEFAULT_KEYBOARD_SETTINGS } from "../types/tabs"
