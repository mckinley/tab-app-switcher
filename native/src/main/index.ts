import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  globalShortcut,
  screen,
  nativeImage
} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import trayIconPath from '../../resources/tas.png?asset'
import { startWebSocketServer, sendMessageToExtension } from './websocketServer'

let tray: Tray | null = null
let tasWindow: BrowserWindow | null = null
let cachedTabs: unknown[] = []
let settingsWindow: BrowserWindow | null = null
let tabManagementWindow: BrowserWindow | null = null

// Hide dock icon on macOS (menu bar app only)
if (process.platform === 'darwin' && app.dock) {
  app.dock.hide()
}

function createTasOverlay(): void {
  if (tasWindow) {
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

    // Send cached tabs to the window
    if (tasWindow && cachedTabs.length > 0) {
      tasWindow.webContents.send('tabs-updated', cachedTabs)
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

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Tab Switcher',
      click: () => createTasOverlay()
    },
    {
      label: 'Settings',
      click: () => createSettingsWindow()
    },
    {
      label: 'Tab Management',
      click: () => createTabManagementWindow()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setToolTip('Tab Application Switcher')
  tray.setContextMenu(contextMenu)

  // Double-click to show TAS overlay
  tray.on('double-click', () => {
    createTasOverlay()
  })
}

// Message handler for WebSocket messages from extension
function handleExtensionMessage(msg: { type: string; tabs?: unknown[] }): void {
  if (msg.type === 'TABS_UPDATED') {
    // Extension is pushing updated tab list
    cachedTabs = msg.tabs || []
    console.log('Updated tab cache:', cachedTabs.length, 'tabs')

    // If TAS window is open, send updated tabs to it
    if (tasWindow && !tasWindow.isDestroyed()) {
      tasWindow.webContents.send('tabs-updated', cachedTabs)
    }

    // If Tab Management window is open, send updated tabs to it
    if (tabManagementWindow && !tabManagementWindow.isDestroyed()) {
      tabManagementWindow.webContents.send('tabs-updated', cachedTabs)
    }
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.tab-app-switcher')

  // Start WebSocket server for extension communication
  startWebSocketServer(handleExtensionMessage)

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

  // Tab management IPC handlers - forward to extension
  ipcMain.on('activate-tab', (_event, tabId: string) => {
    sendMessageToExtension({ type: 'ACTIVATE_TAB', tabId })
  })

  ipcMain.on('close-tab', (_event, tabId: string) => {
    sendMessageToExtension({ type: 'CLOSE_TAB', tabId })
  })

  // Send cached tabs to tab management window when requested
  ipcMain.on('request-tabs', (event) => {
    console.log('Tab Management requested tabs, sending:', cachedTabs.length, 'tabs')
    event.sender.send('tabs-updated', cachedTabs)
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
})
