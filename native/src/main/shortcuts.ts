/**
 * Keyboard Shortcuts Module
 * Handles global shortcut registration and TAS action execution
 */

import { globalShortcut } from 'electron'
import {
  type TasAction,
  type KeyboardSettings,
  getKeyBindings,
  DEFAULT_KEYBOARD_SETTINGS
} from '@tas/keyboard'
import { getTasWindow, hideTasOverlay, isTasOverlayActive, setTasSearchActive } from './windows'

// Track registered accelerators for cleanup
const registeredAccelerators: string[] = []

// Current keyboard settings (updated when user changes settings)
let currentKeyboardSettings: KeyboardSettings = DEFAULT_KEYBOARD_SETTINGS

// The shortcut that opens the overlay (modifier + activateForward, Alt+Tab by default)
let activationAccelerator: string | null = null
let onActivate: (() => void) | null = null
let onActivationUnavailable: ((accelerator: string) => void) | null = null
// Accelerators already reported as taken, so the warning isn't repeated on every hide
const unavailableReported = new Set<string>()

/**
 * Build Electron accelerator string from a shortcut binding
 */
function toElectronAccelerator(
  key: string,
  withModifier: boolean,
  withShift?: boolean,
  modifier: string = 'Alt'
): string {
  const parts: string[] = []
  if (withModifier) parts.push(modifier)
  if (withShift) parts.push('Shift')

  // Map key names to Electron accelerator format
  const keyMap: Record<string, string> = {
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Enter: 'Return'
  }
  // Letters are written in upper case in accelerators
  parts.push(keyMap[key] ?? (key.length === 1 ? key.toUpperCase() : key))

  return parts.join('+')
}

export function getKeyboardSettings(): KeyboardSettings {
  return currentKeyboardSettings
}

/**
 * Set what the activation shortcut does, and what to do when another app already has it
 */
export function initActivationShortcut(handlers: {
  onActivate: () => void
  onUnavailable: (accelerator: string) => void
}): void {
  onActivate = handlers.onActivate
  onActivationUnavailable = handlers.onUnavailable
}

/**
 * Register the shortcut that opens the overlay, from the user's keyboard settings.
 * Returns false (and reports it once per accelerator) when another app has it.
 */
export function registerActivationShortcut(): boolean {
  const accelerator = toElectronAccelerator(
    currentKeyboardSettings.activateForward,
    true,
    false,
    currentKeyboardSettings.modifier
  )
  if (activationAccelerator === accelerator && globalShortcut.isRegistered(accelerator)) return true

  unregisterActivationShortcut()
  if (globalShortcut.register(accelerator, () => onActivate?.())) {
    activationAccelerator = accelerator
    unavailableReported.delete(accelerator)
    return true
  }

  console.error(`[TAS] Couldn't register ${accelerator}; another app may be using it`)
  if (!unavailableReported.has(accelerator)) {
    unavailableReported.add(accelerator)
    onActivationUnavailable?.(accelerator)
  }
  return false
}

/**
 * Unregister the overlay's activation shortcut (while the overlay is open its keys navigate)
 */
export function unregisterActivationShortcut(): void {
  if (activationAccelerator) globalShortcut.unregister(activationAccelerator)
  activationAccelerator = null
}

/**
 * Execute a TAS action
 * Maps shared TasAction types to native app behavior
 */
export function executeTasAction(action: TasAction): void {
  const tasWindow = getTasWindow()

  switch (action) {
    case 'navigateNext':
      tasWindow?.webContents.send('navigate', 'next')
      break
    case 'navigatePrev':
      tasWindow?.webContents.send('navigate', 'prev')
      break
    case 'activateSelected':
      tasWindow?.webContents.send('select-current')
      break
    case 'closeSelectedTab':
      tasWindow?.webContents.send('close-selected-tab')
      break
    case 'dismiss':
      hideTasOverlay()
      break
    case 'focusSearch':
      // Give window focus so user can type in search. Releasing the modifier to type
      // mustn't pick a tab, so Enter picks the highlighted match instead.
      if (tasWindow && !tasWindow.isDestroyed()) {
        setTasSearchActive(true)
        tasWindow.focus()
        tasWindow.webContents.send('focus-search')
      }
      break
    case 'blurSearch':
      setTasSearchActive(false)
      tasWindow?.webContents.send('blur-search')
      break
  }
}

/**
 * Register navigation shortcuts for TAS overlay using current keyboard settings
 */
export function registerTasNavigationShortcuts(): void {
  const bindings = getKeyBindings(currentKeyboardSettings)
  const modifier = currentKeyboardSettings.modifier

  // Build unique accelerators from bindings
  const acceleratorActions = new Map<string, TasAction>()

  for (const binding of bindings) {
    const accelerator = toElectronAccelerator(
      binding.key,
      binding.withModifier,
      binding.withShift,
      modifier
    )
    // First binding for each accelerator wins
    if (!acceleratorActions.has(accelerator)) {
      acceleratorActions.set(accelerator, binding.action)
    }
  }

  // Register each unique accelerator
  for (const [accelerator, action] of acceleratorActions) {
    const success = globalShortcut.register(accelerator, () => {
      executeTasAction(action)
    })
    if (success) {
      registeredAccelerators.push(accelerator)
    }
  }
}

/**
 * Update keyboard settings and re-register shortcuts if TAS overlay is visible
 * Called when user changes keyboard settings in the settings UI
 */
export function updateKeyboardSettings(keyboard: KeyboardSettings): void {
  currentKeyboardSettings = keyboard
  // Navigation shortcuts are only registered while the overlay is shown, so they pick up the
  // new settings next time it opens. The activation shortcut changes now.
  if (!isTasOverlayActive()) registerActivationShortcut()
}

/**
 * Initialize keyboard settings from stored value
 * Should be called on app startup with settings from electron-store
 */
export function initKeyboardSettings(keyboard: KeyboardSettings): void {
  currentKeyboardSettings = keyboard
}

/**
 * Unregister all TAS navigation shortcuts
 */
export function unregisterTasNavigationShortcuts(): void {
  for (const accelerator of registeredAccelerators) {
    globalShortcut.unregister(accelerator)
  }
  registeredAccelerators.length = 0
}
