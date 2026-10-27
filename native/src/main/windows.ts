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

// Window references (singleton pattern)
let tasWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let tabManagementWindow: BrowserWindow | null = null
let aboutWindow: BrowserWindow | null = null

// Whether the overlay's page has loaded, and whether to show it as soon as it has
let tasReady = false
let showWhenReady = false

// Track if TAS overlay is actively shown (for Alt release detection)
let tasOverlayActive = false
// The search box has focus, so releasing the modifier doesn't pick a tab
let tasSearchActive = false

// Dependencies injected from main
interface WindowDependencies {
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
  // Swap them once the key press that opened the overlay has been handled. Registering
  // Alt+Tab for navigation from inside that Alt+Tab's handler made the same press move the
  // selection too (seen on Linux), so the overlay opened on the third tab, not the second.
  setImmediate(() => {
    if (!tasOverlayActive) return
    deps?.unregisterActivationShortcut()
    deps?.registerTasNavigationShortcuts()
  })
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
 * Show the switcher overlay (the activation shortcut and the tray menu)
 */
export function showTasOverlay(): void {
  if (!tasWindow) prepareTasOverlay()
  if (!tasWindow) return

  // Pressed in the moment after launch while the page is still loading: show it once loaded
  if (!tasReady) {
    showWhenReady = true
    return
  }
  showWhenReady = false

  // The hidden window already has the latest tabs (they're sent as they change), so showing
  // it only needs the selection back on the second tab
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
}

/**
 * Build the overlay window, hidden, so the shortcut only has to show it. Building it on the
 * first press meant starting a renderer and loading the page before anything appeared, which
 * made the first Alt+Tab after launch slow.
 */
export function prepareTasOverlay(): void {
  if (tasWindow || !deps) return

  // Full display size, not workArea, on the display the pointer is on
  const { x, y, width, height } = screen.getDisplayNearestPoint(
    screen.getCursorScreenPoint()
  ).bounds

  // Create frameless, always-on-top, full-screen overlay window
  // Full-screen ensures we capture ALL clicks (like macOS app switcher)
  // The transparent background catches clicks and dismisses the overlay
  const overlay = new BrowserWindow({
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
      nodeIntegration: false,
      // Keep rendering while hidden, so tab changes are already drawn when it's shown
      backgroundThrottling: false
    }
  })
  tasWindow = overlay
  tasReady = false

  overlay.once('ready-to-show', () => {
    tasReady = true
    if (showWhenReady) showTasOverlay()
  })

  overlay.on('blur', () => {
    // Only hide on blur if we're taking focus (non-macOS or if user clicks elsewhere)
    // On macOS with showInactive, blur may not fire, so we rely on Escape/Enter.
    // Ignore the blur that comes from hiding the overlay ourselves, and check again when the
    // timer fires: a quick second Alt+Tab may have shown the overlay again by then.
    if (process.platform !== 'darwin' && tasOverlayActive) {
      setTimeout(() => {
        if (!overlay.isDestroyed() && !overlay.isFocused()) {
          hideTasOverlay()
        }
      }, 100)
    }
  })

  overlay.on('hide', () => {
    // Cleanup is handled by hideTasOverlay, but ensure shortcuts are correct
    enableActivationShortcut()
    // Clear the search and scrolling now, while it's hidden, rather than when it's next shown
    if (!overlay.webContents.isDestroyed()) overlay.webContents.send('overlay-hidden')
  })

  overlay.on('closed', () => {
    if (tasWindow === overlay) {
      tasWindow = null
      tasReady = false
    }
    tasOverlayActive = false
    enableActivationShortcut()
  })

  // If the page's process dies, build a new window so the next Alt+Tab isn't a blank one
  overlay.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason === 'clean-exit' || overlay.isDestroyed()) return
    overlay.destroy()
    prepareTasOverlay()
  })

  // Load TAS UI
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    overlay.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/tas.html`)
  } else {
    overlay.loadFile(join(__dirname, '../renderer/tas.html'))
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
