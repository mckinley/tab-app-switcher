/**
 * Window Management Module
 * Handles creation and lifecycle of all Electron windows:
 * - TAS Overlay (transparent switcher)
 * - Settings window
 * - Tab Management window
 * - About window
 */

import { BrowserWindow, globalShortcut, screen, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type { Tab } from '@tas/types/tabs'

// Window references (singleton pattern)
let tasWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let tabManagementWindow: BrowserWindow | null = null
let aboutWindow: BrowserWindow | null = null

// Track if TAS overlay is actively shown (for Alt release detection)
let tasOverlayActive = false

// Dependencies injected from main
interface WindowDependencies {
  getDisplayTabs: () => Tab[]
  registerTasNavigationShortcuts: () => void
  unregisterTasNavigationShortcuts: () => void
  onTasOverlayCreated?: () => void
}

let deps: WindowDependencies | null = null

/**
 * Initialize window module with dependencies
 */
export function initWindows(dependencies: WindowDependencies): void {
  deps = dependencies
}

/**
 * Get window references (for external modules that need them)
 */
export function getTasWindow(): BrowserWindow | null {
  return tasWindow
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow
}

export function getTabManagementWindow(): BrowserWindow | null {
  return tabManagementWindow
}

export function getAboutWindow(): BrowserWindow | null {
  return aboutWindow
}

/**
 * Check if TAS overlay is currently active (shown)
 */
export function isTasOverlayActive(): boolean {
  return tasOverlayActive
}

/**
 * Set TAS overlay active state (for Alt release detection)
 */
export function setTasOverlayActive(active: boolean): void {
  tasOverlayActive = active
}

/**
 * Select current tab and hide overlay
 * Called when Alt is released while overlay is active
 */
export function selectCurrentTabAndHide(): void {
  // Immediately disable Alt-release behavior to prevent re-entrant calls
  tasOverlayActive = false

  // Send select-current to renderer, then hide
  if (tasWindow && !tasWindow.isDestroyed()) {
    tasWindow.webContents.send('select-current')
  }
  // Small delay to let the select-current message be processed
  setTimeout(() => {
    hideTasOverlay()
  }, 50)
}

/**
 * Hide TAS overlay and cleanup shortcuts
 */
export function hideTasOverlay(): void {
  if (tasWindow && !tasWindow.isDestroyed()) {
    tasOverlayActive = false
    tasWindow.hide()
    deps?.unregisterTasNavigationShortcuts()
    // Re-register Alt+Tab trigger
    if (!globalShortcut.isRegistered('Alt+Tab')) {
      globalShortcut.register('Alt+Tab', () => {
        createTasOverlay()
      })
    }
  }
}

/**
 * Create or show the TAS overlay window
 */
export function createTasOverlay(): void {
  if (!deps) {
    console.error('[Windows] Dependencies not initialized')
    return
  }

  const displayTabs = deps.getDisplayTabs()

  if (tasWindow) {
    // Send cached displayTabs immediately - should be fresh from event updates
    if (displayTabs.length > 0) {
      tasWindow.webContents.send('tabs-updated', displayTabs)
    }
    // Reset selection to second tab when reopening
    tasWindow.webContents.send('reset-selection')

    // Show without stealing focus on macOS (like native app switcher)
    if (process.platform === 'darwin') {
      tasWindow.showInactive()
    } else {
      tasWindow.show()
      tasWindow.focus()
    }

    // Mark overlay as active for Alt release detection
    tasOverlayActive = true

    // Unregister Alt+Tab trigger, register navigation shortcuts
    globalShortcut.unregister('Alt+Tab')
    deps.registerTasNavigationShortcuts()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size // Use full display size, not workArea

  // Create frameless, always-on-top, full-screen overlay window
  // Full-screen ensures we capture ALL clicks (like macOS app switcher)
  // The transparent background catches clicks and dismisses the overlay
  tasWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    acceptFirstMouse: true, // Allow clicks without focusing first
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  tasWindow.on('ready-to-show', () => {
    // Unregister Alt+Tab trigger, register navigation shortcuts
    globalShortcut.unregister('Alt+Tab')
    deps?.registerTasNavigationShortcuts()

    // Send cached displayTabs to the window
    const tabs = deps?.getDisplayTabs() ?? []
    if (tasWindow && tabs.length > 0) {
      tasWindow.webContents.send('tabs-updated', tabs)
    }

    // Mark overlay as active for Alt release detection
    tasOverlayActive = true

    // Show without stealing focus on macOS (like native app switcher)
    if (process.platform === 'darwin') {
      tasWindow?.showInactive()
    } else {
      tasWindow?.show()
      tasWindow?.focus()
    }
  })

  tasWindow.on('blur', () => {
    // Only hide on blur if we're taking focus (non-macOS or if user clicks elsewhere)
    // On macOS with showInactive, blur may not fire, so we rely on Escape/Enter
    if (process.platform !== 'darwin') {
      setTimeout(() => {
        hideTasOverlay()
      }, 100)
    }
  })

  tasWindow.on('hide', () => {
    // Cleanup is handled by hideTasOverlay, but ensure shortcuts are correct
    deps?.unregisterTasNavigationShortcuts()
    if (!globalShortcut.isRegistered('Alt+Tab')) {
      globalShortcut.register('Alt+Tab', () => {
        createTasOverlay()
      })
    }
  })

  tasWindow.on('closed', () => {
    tasWindow = null
    deps?.unregisterTasNavigationShortcuts()
    // Re-register global shortcut when window is closed
    if (!globalShortcut.isRegistered('Alt+Tab')) {
      globalShortcut.register('Alt+Tab', () => {
        createTasOverlay()
      })
    }
  })

  // Load TAS UI
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    tasWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/tas.html`)
  } else {
    tasWindow.loadFile(join(__dirname, '../renderer/tas.html'))
  }
}

/**
 * Create or show the Settings window
 */
export function createSettingsWindow(initialTab?: 'keys' | 'options' | 'setup'): void {
  if (settingsWindow) {
    // If window exists, send message to switch tab if specified
    if (initialTab) {
      settingsWindow.webContents.send('switch-tab', initialTab)
    }
    settingsWindow.show()
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 560,
    height: 520,
    title: 'Tab Application Switcher — App Settings',
    resizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  settingsWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Build URL with initial tab parameter
  const tabParam = initialTab ? `?tab=${initialTab}` : ''

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/settings.html${tabParam}`)
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/settings.html'), {
      query: initialTab ? { tab: initialTab } : undefined
    })
  }
}

/**
 * Create or show the Tab Management window
 */
export function createTabManagementWindow(): void {
  if (tabManagementWindow) {
    tabManagementWindow.show()
    tabManagementWindow.focus()
    return
  }

  tabManagementWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Tab Management - TAS',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  tabManagementWindow.on('closed', () => {
    tabManagementWindow = null
  })

  tabManagementWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    tabManagementWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/tab-management.html`)
  } else {
    tabManagementWindow.loadFile(join(__dirname, '../renderer/tab-management.html'))
  }
}

/**
 * Create or show the About window
 */
export function createAboutWindow(): void {
  if (aboutWindow) {
    aboutWindow.show()
    aboutWindow.focus()
    return
  }

  aboutWindow = new BrowserWindow({
    width: 300,
    height: 320,
    title: 'About TAS',
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  aboutWindow.on('closed', () => {
    aboutWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    aboutWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/about.html`)
  } else {
    aboutWindow.loadFile(join(__dirname, '../renderer/about.html'))
  }
}
