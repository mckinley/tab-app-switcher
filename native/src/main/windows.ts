/**
 * Window Management Module
 * Handles creation and lifecycle of all Electron windows:
 * - TAS Overlay (transparent switcher)
 * - Settings window
 * - Tab Management window
 * - About window
 */

import { BrowserWindow, screen, shell } from 'electron'
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
// The search box has focus, so releasing the modifier doesn't pick a tab
let tasSearchActive = false

// Dependencies injected from main
interface WindowDependencies {
  getDisplayTabs: () => Tab[]
  registerTasNavigationShortcuts: () => void
  unregisterTasNavigationShortcuts: () => void
  registerActivationShortcut: () => void
  unregisterActivationShortcut: () => void
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

export function isTasSearchActive(): boolean {
  return tasSearchActive
}

export function setTasSearchActive(active: boolean): void {
  tasSearchActive = active
}

/** Cover the display the pointer is on, so the overlay opens where the person is working */
function fitToCurrentDisplay(window: BrowserWindow): void {
  const { bounds } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  window.setBounds(bounds)
}

/** While the overlay shows, its keys navigate instead of opening it */
function enableOverlayShortcuts(): void {
  tasOverlayActive = true
  tasSearchActive = false
  deps?.unregisterActivationShortcut()
  deps?.registerTasNavigationShortcuts()
}

function enableActivationShortcut(): void {
  tasSearchActive = false
  deps?.unregisterTasNavigationShortcuts()
  deps?.registerActivationShortcut()
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
    enableActivationShortcut()
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
    fitToCurrentDisplay(tasWindow)

    // Show without stealing focus on macOS (like native app switcher)
    if (process.platform === 'darwin') {
      tasWindow.showInactive()
    } else {
      tasWindow.show()
      tasWindow.focus()
    }

    enableOverlayShortcuts()
    return
  }

  // Full display size, not workArea, on the display the pointer is on
  const { x, y, width, height } = screen.getDisplayNearestPoint(
    screen.getCursorScreenPoint()
  ).bounds

  // Create frameless, always-on-top, full-screen overlay window
  // Full-screen ensures we capture ALL clicks (like macOS app switcher)
  // The transparent background catches clicks and dismisses the overlay
  tasWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
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
    enableOverlayShortcuts()

    // Send cached displayTabs to the window
    const tabs = deps?.getDisplayTabs() ?? []
    if (tasWindow && tabs.length > 0) {
      tasWindow.webContents.send('tabs-updated', tabs)
    }

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
    // On macOS with showInactive, blur may not fire, so we rely on Escape/Enter.
    // Ignore the blur that comes from hiding the overlay ourselves, and check again when the
    // timer fires: a quick second Alt+Tab may have shown the overlay again by then.
    if (process.platform !== 'darwin' && tasOverlayActive) {
      setTimeout(() => {
        if (tasWindow && !tasWindow.isDestroyed() && !tasWindow.isFocused()) {
          hideTasOverlay()
        }
      }, 100)
    }
  })

  tasWindow.on('hide', () => {
    // Cleanup is handled by hideTasOverlay, but ensure shortcuts are correct
    enableActivationShortcut()
  })

  tasWindow.on('closed', () => {
    tasWindow = null
    tasOverlayActive = false
    enableActivationShortcut()
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
