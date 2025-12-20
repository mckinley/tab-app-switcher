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
import { getTasWindow, hideTasOverlay } from './windows'

// Track registered accelerators for cleanup
const registeredAccelerators: string[] = []

// Current keyboard settings (updated when user changes settings)
let currentKeyboardSettings: KeyboardSettings = DEFAULT_KEYBOARD_SETTINGS

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
  parts.push(keyMap[key] ?? key)

  return parts.join('+')
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
      // Give window focus so user can type in search
      if (tasWindow && !tasWindow.isDestroyed()) {
        tasWindow.focus()
        tasWindow.webContents.send('focus-search')
      }
      break
    case 'blurSearch':
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
  // Note: Shortcuts are only active when TAS overlay is shown,
  // so they will automatically use the new settings next time the overlay opens
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
