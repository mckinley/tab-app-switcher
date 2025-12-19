/**
 * Tray Module
 * Handles system tray icon and context menu
 */

import { app, Menu, nativeImage, Tray } from 'electron'
import icon from '../../resources/icon.png?asset'
import trayIconPath from '../../resources/tas.png?asset'
import { getActiveSessions, getConnectedBrowsers } from './websocketServer'
import {
  createTasOverlay,
  createSettingsWindow,
  createTabManagementWindow,
  createAboutWindow
} from './windows'

let tray: Tray | null = null

/**
 * Get the tray instance
 */
export function getTray(): Tray | null {
  return tray
}

/**
 * Set the tray instance (for cleanup)
 */
export function setTray(newTray: Tray | null): void {
  tray = newTray
}

/**
 * Create the system tray icon
 */
export function createTray(): void {
  // Load the tray icon and resize for menu bar (22x22 for standard, 44x44 for retina)
  let trayImage = nativeImage.createFromPath(trayIconPath)

  if (trayImage.isEmpty()) {
    console.error('Failed to load tray icon, using fallback')
    // Fallback to main icon
    trayImage = nativeImage.createFromPath(icon)
  }

  if (!trayImage.isEmpty()) {
    // Resize to 22x22 (macOS will use 44x44 for retina automatically)
    trayImage = trayImage.resize({ width: 22, height: 22 })
  }

  // On macOS, mark as template image for automatic theme adaptation
  if (process.platform === 'darwin' && !trayImage.isEmpty()) {
    trayImage.setTemplateImage(true)
  }

  tray = new Tray(trayImage)

  updateTrayMenu()
}

/**
 * Update the tray context menu based on current connection state
 */
export function updateTrayMenu(): void {
  if (!tray) return

  const activeSessions = getActiveSessions()
  const isConnected = activeSessions.length > 0
  const connectedBrowsers = getConnectedBrowsers()

  // Build status label based on connection state
  let statusLabel: string
  if (!isConnected) {
    statusLabel = '✗ No browsers connected'
  } else if (activeSessions.length === 1) {
    // Single session - show browser name
    const browserName = connectedBrowsers[0].charAt(0).toUpperCase() + connectedBrowsers[0].slice(1)
    statusLabel = `✓ Connected: ${browserName}`
  } else {
    // Multiple sessions - could be multiple browsers or multiple profiles
    const uniqueBrowsers = connectedBrowsers.length
    if (uniqueBrowsers === activeSessions.length) {
      // Each session is a different browser
      statusLabel = `✓ ${activeSessions.length} browsers connected`
    } else {
      // Multiple profiles of same browser(s)
      statusLabel = `✓ ${activeSessions.length} sessions connected`
    }
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: statusLabel,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Show Tab Switcher',
      click: () => createTasOverlay(),
      enabled: isConnected
    },
    {
      label: 'Tab Management',
      click: () => createTabManagementWindow(),
      enabled: isConnected
    },
    { type: 'separator' },
    {
      label: 'Setup...',
      click: () => createSettingsWindow('setup')
    },
    {
      label: 'Settings...',
      click: () => createSettingsWindow('keys')
    },
    { type: 'separator' },
    {
      label: 'About TAS',
      click: () => createAboutWindow()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setToolTip(
    isConnected
      ? `TAS - ${activeSessions.length} session${activeSessions.length > 1 ? 's' : ''} connected`
      : 'TAS - No browsers connected'
  )
  tray.setContextMenu(contextMenu)
}

/**
 * Destroy the tray icon
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
