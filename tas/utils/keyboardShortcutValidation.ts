/**
 * Utility functions for validating keyboard shortcuts
 * Helps identify problematic key combinations that may not work across platforms
 */

export interface ShortcutValidationResult {
  isValid: boolean
  warnings: string[]
  errors: string[]
}

/**
 * Keys that produce special characters with Option/Alt on macOS
 * These will work with our e.code implementation, but users should be aware
 */
const MAC_OPTION_SPECIAL_CHARS: Record<string, string> = {
  A: "å",
  B: "∫",
  C: "ç",
  D: "∂",
  E: "´",
  F: "ƒ",
  G: "©",
  H: "˙",
  I: "ˆ",
  J: "∆",
  K: "˚",
  L: "¬",
  M: "µ",
  N: "˜",
  O: "ø",
  P: "π",
  Q: "œ",
  R: "®",
  S: "ß",
  T: "†",
  U: "¨",
  V: "√",
  W: "∑",
  X: "≈",
  Y: "¥",
  Z: "Ω",
}

/**
 * Browser shortcuts that will be intercepted and never reach the app
 * Format: "Modifier+Key" -> "Description"
 */
const BROWSER_SHORTCUTS: Record<string, string> = {
  // macOS
  "Cmd+W": "Close tab (macOS)",
  "Cmd+T": "New tab (macOS)",
  "Cmd+N": "New window (macOS)",
  "Cmd+Q": "Quit browser (macOS)",
  "Cmd+R": "Reload page (macOS)",
  "Cmd+L": "Focus address bar (macOS)",
  "Cmd+K": "Focus search (macOS)",
  "Cmd+F": "Find in page (macOS)",
  "Cmd+G": "Find next (macOS)",
  "Cmd+H": "Hide window (macOS)",
  "Cmd+M": "Minimize window (macOS)",

  // Windows/Linux
  "Ctrl+W": "Close tab (Windows/Linux)",
  "Ctrl+T": "New tab (Windows/Linux)",
  "Ctrl+N": "New window (Windows/Linux)",
  "Ctrl+R": "Reload page (Windows/Linux)",
  "Ctrl+L": "Focus address bar (Windows/Linux)",
  "Ctrl+K": "Focus search (Windows/Linux)",
  "Ctrl+F": "Find in page (Windows/Linux)",
  "Ctrl+G": "Find next (Windows/Linux)",
  "Ctrl+H": "History (Windows/Linux)",
  "Ctrl+Q": "Quit browser (Linux)",

  // Both
  "Alt+F": "File menu (Windows/Linux)",
  "Alt+E": "Edit menu (Windows/Linux)",
  "Alt+V": "View menu (Windows/Linux)",
  "Alt+H": "Help menu (Windows/Linux)",
}

/**
 * Validate a keyboard shortcut combination
 */
export function validateShortcut(modifier: string, key: string, purpose: string): ShortcutValidationResult {
  const warnings: string[] = []
  const errors: string[] = []

  // Check if it's a browser shortcut
  const shortcutCombo = `${modifier}+${key.toUpperCase()}`
  if (BROWSER_SHORTCUTS[shortcutCombo]) {
    errors.push(`${shortcutCombo} is a browser shortcut (${BROWSER_SHORTCUTS[shortcutCombo]}) and will not work`)
  }

  // Check if using Alt/Option with a letter on macOS
  if (modifier === "Alt" || modifier === "Option") {
    const upperKey = key.toUpperCase()
    if (MAC_OPTION_SPECIAL_CHARS[upperKey]) {
      warnings.push(
        `On macOS, Option+${key.toUpperCase()} produces "${MAC_OPTION_SPECIAL_CHARS[upperKey]}" - ` +
          `this will work with our implementation but may be confusing to users`,
      )
    }
  }

  // Check if key is empty or invalid
  if (!key || key.trim() === "") {
    errors.push(`${purpose} key cannot be empty`)
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  }
}

/**
 * Validate all shortcuts in a KeyboardShortcuts object
 */
export function validateAllShortcuts(shortcuts: {
  modifier: string
  activateForward: string
  activateBackward: string
  closeTab: string
  search: string
}): ShortcutValidationResult {
  const allWarnings: string[] = []
  const allErrors: string[] = []

  // Validate each shortcut
  const results = [
    validateShortcut(shortcuts.modifier, shortcuts.activateForward, "Activate Forward"),
    validateShortcut(shortcuts.modifier, shortcuts.activateBackward, "Activate Backward"),
    validateShortcut(shortcuts.modifier, shortcuts.closeTab, "Close Tab"),
    validateShortcut(shortcuts.modifier, shortcuts.search, "Search"),
  ]

  // Collect all warnings and errors
  results.forEach((result) => {
    allWarnings.push(...result.warnings)
    allErrors.push(...result.errors)
  })

  // Check for duplicate keys
  const keys = [shortcuts.activateForward, shortcuts.activateBackward, shortcuts.closeTab, shortcuts.search]
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index)
  if (duplicates.length > 0) {
    allErrors.push(`Duplicate keys found: ${duplicates.join(", ")}`)
  }

  return {
    isValid: allErrors.length === 0,
    warnings: allWarnings,
    errors: allErrors,
  }
}

/**
 * Get a user-friendly warning message for a shortcut combination
 */
export function getShortcutWarning(modifier: string, key: string): string | null {
  const result = validateShortcut(modifier, key, "Shortcut")

  if (result.errors.length > 0) {
    return `❌ ${result.errors[0]}`
  }

  if (result.warnings.length > 0) {
    return `⚠️ ${result.warnings[0]}`
  }

  return null
}
