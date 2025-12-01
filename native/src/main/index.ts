import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  globalShortcut,
  screen,
  nativeImage,
  Notification
} from 'electron'
import { join } from 'path'
import { exec } from 'child_process'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import trayIconPath from '../../resources/tas.png?asset'
import {
  startWebSocketServer,
  sendMessageToBrowser,
  sendMessageToAllExtensions,
  isExtensionConnected,
  getConnectedBrowsers
} from './websocketServer'
import { setupAutoUpdater } from './autoUpdater'
import type { BrowserType } from '@tas/types/tabs'

interface CachedTab {
  id: string
  title: string
  url: string
  favicon: string
  windowId?: number
  index?: number
  browser?: BrowserType
}

let tray: Tray | null = null
let tasWindow: BrowserWindow | null = null
// Global MRU list of all tabs across all browsers
let globalMruTabs: CachedTab[] = []
// Per-browser tab caches (updated when each browser sends TABS_UPDATED)
const browserTabCaches: Map<BrowserType, CachedTab[]> = new Map()
let settingsWindow: BrowserWindow | null = null
let tabManagementWindow: BrowserWindow | null = null

// Map browser types to application names for AppleScript
const browserAppNames: Record<BrowserType, string> = {
  chrome: 'Google Chrome',
  firefox: 'Firefox',
  edge: 'Microsoft Edge',
  safari: 'Safari',
  unknown: 'Google Chrome'
}

/**
 * Activate (focus) a browser application using AppleScript
 */
function activateBrowserApp(browser: BrowserType): void {
  if (process.platform !== 'darwin') return

  const appName = browserAppNames[browser]
  const script = `tell application "${appName}" to activate`

  exec(`osascript -e '${script}'`, (error) => {
    if (error) {
      console.error(`Failed to activate ${appName}:`, error)
    }
  })
}

/**
 * Merge tabs from all browsers into a single global MRU list
 * Preserves existing order for tabs that are still present
 */
function updateGlobalMruTabs(activeBrowser?: BrowserType): void {
  // Get all current tabs from all browser caches
  const allCurrentTabs = new Map<string, CachedTab>()
  console.log('updateGlobalMruTabs - browserTabCaches keys:', [...browserTabCaches.keys()])
  browserTabCaches.forEach((tabs, browser) => {
    tabs.forEach((tab) => {
      // Create a unique key combining browser and tab ID
      const key = `${browser}:${tab.id}`
      allCurrentTabs.set(key, { ...tab, browser })
    })
  })

  // Remove tabs from global MRU that no longer exist
  globalMruTabs = globalMruTabs.filter((tab) => {
    const key = `${tab.browser}:${tab.id}`
    return allCurrentTabs.has(key)
  })

  // Add new tabs to the end of the global MRU (they'll move up when accessed)
  const existingKeys = new Set(globalMruTabs.map((tab) => `${tab.browser}:${tab.id}`))
  allCurrentTabs.forEach((tab, key) => {
    if (!existingKeys.has(key)) {
      globalMruTabs.push(tab)
    }
  })

  // If we know which browser just sent an update, promote its first tab
  // (the most recently used tab in that browser) to the front of the global MRU
  if (activeBrowser) {
    const browserTabs = browserTabCaches.get(activeBrowser)
    if (browserTabs && browserTabs.length > 0) {
      const mostRecentTab = browserTabs[0]
      promoteTabInGlobalMru(activeBrowser, String(mostRecentTab.id))
    }
  }
}

/**
 * Move a tab to the front of the global MRU list
 */
function promoteTabInGlobalMru(browser: BrowserType, tabId: string): void {
  const key = `${browser}:${tabId}`
  const index = globalMruTabs.findIndex((tab) => `${tab.browser}:${tab.id}` === key)

  if (index > 0) {
    const [tab] = globalMruTabs.splice(index, 1)
    globalMruTabs.unshift(tab)
  }
}

// Hide dock icon on macOS (menu bar app only)
if (process.platform === 'darwin' && app.dock) {
  app.dock.hide()
}

function createTasOverlay(): void {
  if (tasWindow) {
    // Send global MRU tabs immediately so window isn't empty
    if (globalMruTabs.length > 0) {
      tasWindow.webContents.send('tabs-updated', globalMruTabs)
    }
    // Request fresh tabs from all connected extensions
    sendMessageToAllExtensions({ type: 'GET_TABS' })
    // Reset selection to second tab when reopening
    tasWindow.webContents.send('reset-selection')
    tasWindow.show()
    tasWindow.focus()
    // Unregister global shortcut so the window can handle Alt+Tab
    globalShortcut.unregister('Alt+Tab')
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  // Create frameless, always-on-top overlay window (like macOS app switcher)
  tasWindow = new BrowserWindow({
    width: 600,
    height: 400,
    x: Math.floor((width - 600) / 2),
    y: Math.floor((height - 400) / 2),
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
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  tasWindow.on('ready-to-show', () => {
    // Unregister global shortcut so the window can handle Alt+Tab
    globalShortcut.unregister('Alt+Tab')

    // Send global MRU tabs to the window
    if (tasWindow && globalMruTabs.length > 0) {
      tasWindow.webContents.send('tabs-updated', globalMruTabs)
    }

    tasWindow?.show()
    tasWindow?.focus()
  })

  tasWindow.on('blur', () => {
    // Hide when focus is lost (like macOS app switcher)
    // Delay slightly to allow clicks to register
    setTimeout(() => {
      if (tasWindow && !tasWindow.isDestroyed()) {
        tasWindow.hide()
      }
    }, 100)
  })

  tasWindow.on('hide', () => {
    // Re-register global shortcut when window is hidden
    const registered = globalShortcut.register('Alt+Tab', () => {
      createTasOverlay()
    })
    if (!registered) {
      console.error('Failed to re-register global shortcut Alt+Tab')
    }
  })

  tasWindow.on('closed', () => {
    tasWindow = null
    // Re-register global shortcut when window is closed
    const registered = globalShortcut.register('Alt+Tab', () => {
      createTasOverlay()
    })
    if (!registered) {
      console.error('Failed to re-register global shortcut Alt+Tab')
    }
  })

  // Load TAS UI
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    tasWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/tas.html`)
  } else {
    tasWindow.loadFile(join(__dirname, '../renderer/tas.html'))
  }
}

function createSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.show()
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 650,
    height: 600,
    title: 'Settings - Tab Application Switcher',
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

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/settings.html`)
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/settings.html'))
  }
}

function createTabManagementWindow(): void {
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
    title: 'Tab Management - Tab Application Switcher',
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

function createTray(): void {
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

function updateTrayMenu(): void {
  if (!tray) return

  const extensionConnected = isExtensionConnected()
  const statusLabel = extensionConnected ? '✓ Extension Connected' : '✗ Extension Not Connected'

  const contextMenu = Menu.buildFromTemplate([
    {
      label: statusLabel,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Show Tab Switcher',
      click: () => createTasOverlay(),
      enabled: extensionConnected
    },
    {
      label: 'Settings',
      click: () => createSettingsWindow()
    },
    {
      label: 'Tab Management',
      click: () => createTabManagementWindow(),
      enabled: extensionConnected
    },
    { type: 'separator' },
    {
      label: extensionConnected ? 'Extension Connected' : 'Install Extension',
      click: () => {
        if (!extensionConnected) {
          shell.openExternal('https://chrome.google.com/webstore')
        }
      },
      enabled: !extensionConnected
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
    extensionConnected
      ? 'Tab Application Switcher - Connected'
      : 'Tab Application Switcher - Extension Not Connected'
  )
  tray.setContextMenu(contextMenu)
}

function showExtensionNotInstalledNotification(): void {
  const notification = new Notification({
    title: 'Tab Application Switcher',
    body: 'Browser extension not detected. Install the extension to use Tab Application Switcher.',
    silent: false
  })

  notification.on('click', () => {
    shell.openExternal('https://chrome.google.com/webstore')
  })

  notification.show()
}

// Message handler for WebSocket messages from extension
function handleExtensionMessage(msg: {
  type: string
  tabs?: unknown[]
  tabId?: string
  browser?: BrowserType
}): void {
  const browser = msg.browser || 'unknown'

  if (msg.type === 'TAB_ACTIVATED') {
    // A tab was activated in the browser - promote it in global MRU
    if (msg.tabId) {
      console.log(`Tab activated in ${browser}:`, msg.tabId)
      promoteTabInGlobalMru(browser, msg.tabId)
    }
    return
  }

  if (msg.type === 'TABS_UPDATED' || msg.type === 'TABS_RESPONSE') {
    const tabs = (msg.tabs || []) as CachedTab[]

    // Store per-browser cache
    browserTabCaches.set(browser, tabs)
    console.log(`Updated ${browser} tab cache:`, tabs.length, 'tabs')
    // Debug: log browser field from first tab
    if (tabs.length > 0) {
      console.log(`First tab browser field:`, tabs[0].browser, `Title:`, tabs[0].title)
    }

    // Rebuild global MRU from all browser caches, promoting the active browser's first tab
    updateGlobalMruTabs(browser)
    console.log(
      'Global MRU tabs:',
      globalMruTabs.length,
      'tabs from',
      getConnectedBrowsers().join(', ')
    )

    // If TAS window is open, send global MRU tabs to it
    if (tasWindow && !tasWindow.isDestroyed()) {
      tasWindow.webContents.send('tabs-updated', globalMruTabs)
    }

    // If Tab Management window is open, send global MRU tabs to it
    if (tabManagementWindow && !tabManagementWindow.isDestroyed()) {
      tabManagementWindow.webContents.send('tabs-updated', globalMruTabs)
    }
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.tab-app-switcher')

  // Start WebSocket server for extension communication
  startWebSocketServer(handleExtensionMessage, updateTrayMenu)

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Create tray icon
  createTray()

  // Register global keyboard shortcut (Alt+Tab)
  const registered = globalShortcut.register('Alt+Tab', () => {
    createTasOverlay()
  })

  if (!registered) {
    console.error('Failed to register global shortcut Alt+Tab')
  }

  // Check for extension connection after a delay
  setTimeout(() => {
    if (!isExtensionConnected()) {
      showExtensionNotInstalledNotification()
    }
  }, 3000)

  // Setup auto-updater
  setupAutoUpdater()

  // IPC handlers
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.on('hide-tas', () => {
    tasWindow?.hide()
  })

  ipcMain.on('show-settings', () => {
    createSettingsWindow()
  })

  ipcMain.on('show-tab-management', () => {
    createTabManagementWindow()
  })

  // Tab management IPC handlers - forward to correct browser's extension
  ipcMain.on('activate-tab', (_event, tabId: string, browser?: BrowserType) => {
    // Find the tab in global MRU to get its browser if not provided
    const tab = globalMruTabs.find((t) => t.id === tabId)
    const targetBrowser = browser || tab?.browser || 'chrome'

    // Send activation message to the specific browser
    sendMessageToBrowser(targetBrowser, { type: 'ACTIVATE_TAB', tabId })

    // Activate the browser application
    activateBrowserApp(targetBrowser)

    // Promote this tab in the global MRU
    promoteTabInGlobalMru(targetBrowser, tabId)
  })

  ipcMain.on('close-tab', (_event, tabId: string, browser?: BrowserType) => {
    // Find the tab in global MRU to get its browser if not provided
    const tab = globalMruTabs.find((t) => t.id === tabId)
    const targetBrowser = browser || tab?.browser || 'chrome'

    // Send close message to the specific browser
    sendMessageToBrowser(targetBrowser, { type: 'CLOSE_TAB', tabId })
  })

  // Send global MRU tabs when requested
  ipcMain.on('request-tabs', (event) => {
    console.log('Tab Management requested tabs, sending:', globalMruTabs.length, 'tabs')
    event.sender.send('tabs-updated', globalMruTabs)
  })
})

// Don't quit when all windows are closed (menu bar app)
app.on('window-all-closed', () => {
  // Keep app running
})

// Prevent app from quitting on errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
  // Don't quit - menu bar app should stay running
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
  // Don't quit - menu bar app should stay running
})

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll()

  // Destroy tray icon
  if (tray) {
    tray.destroy()
    tray = null
  }
})
