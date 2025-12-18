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
import Store from 'electron-store'
import { join } from 'path'
import { exec } from 'child_process'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import trayIconPath from '../../resources/tas.png?asset'
import {
  startWebSocketServer,
  sendCommand,
  getConnectedBrowsers,
  getActiveSessions,
  type Session,
  type SessionKey
} from './websocketServer'
import { setupAutoUpdater } from './autoUpdater'
import { setupAuthHandlers } from './auth'
import { loadTabData, saveTabData } from './tabStorage'
import type { Tab, BrowserType } from '@tas/types/tabs'
import type {
  EventPayload,
  BrowserTab,
  BrowserWindow as ProtocolBrowserWindow,
  TabAugmentation,
  SessionTab,
  DeviceSession
} from '@tas/types/protocol'
import { sortTabsWithSections, type SortStrategy } from '@tas/sorting'

let tray: Tray | null = null
let tasWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let tabManagementWindow: BrowserWindow | null = null
let aboutWindow: BrowserWindow | null = null

// Display-ready tabs cache (pre-sorted, ready for immediate display)
let displayTabs: Tab[] = []

/**
 * Build a display ID from session and tab ID
 * Format: "instancePrefix:originalTabId" (e.g., "a1b2c3d4:42")
 */
function buildDisplayId(session: Session, tabId: number): string {
  return `${session.instanceId.substring(0, 8)}:${tabId}`
}

// App settings store with preferences
interface AppSettingsSchema {
  hasCompletedFirstRun: boolean
  launchOnLogin: boolean
  hideMenuBarIcon: boolean
  checkUpdatesAutomatically: boolean
  theme: 'light' | 'dark' | 'system'
  sortStrategy: SortStrategy
}

const appSettingsStore = new Store<AppSettingsSchema>({
  name: 'app-settings',
  defaults: {
    hasCompletedFirstRun: false,
    launchOnLogin: false,
    hideMenuBarIcon: false,
    checkUpdatesAutomatically: true,
    theme: 'system',
    sortStrategy: 'lastActivated'
  }
})

// Git commit hash (injected at build time or fallback)
const GIT_COMMIT_HASH = process.env.GIT_COMMIT_HASH || 'dev'

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
 * Rebuild displayTabs from all active sessions
 * This is called whenever session state changes
 */
function rebuildDisplayTabs(): void {
  const sessions = getActiveSessions()

  // Temporary lookup: sorting ID -> { displayId, browserType }
  // Used to replace numeric sorting IDs with proper string display IDs after sorting
  const sortingIdToInfo: Map<
    number,
    {
      displayId: string
      browserType: BrowserType
    }
  > = new Map()

  // Collect all data from all sessions
  const allSessionTabs: BrowserTab[] = []
  const allSessionWindows: ProtocolBrowserWindow[] = []
  const allAugmentation: Record<string, TabAugmentation> = {}
  const allRecentlyClosed: SessionTab[] = []
  const allOtherDevices: DeviceSession[] = []

  sessions.forEach((session) => {
    session.sessionTabs.forEach((browserTab) => {
      const originalTabId = browserTab.id
      if (originalTabId === undefined) return

      // Create a numeric ID for sorting (sortTabsWithSections expects numeric BrowserTab.id)
      const sortingId = parseInt(
        `${session.instanceId.substring(0, 8)}${originalTabId}`.replace(/[^0-9]/g, '').slice(0, 10)
      )

      // Build the proper display ID (format: "prefix:tabId")
      const displayId = buildDisplayId(session, originalTabId)

      // Store lookup info for post-processing
      sortingIdToInfo.set(sortingId, {
        displayId,
        browserType: session.browserType
      })

      // Create tab with sorting ID for sortTabsWithSections
      allSessionTabs.push({
        ...browserTab,
        id: sortingId
      })

      // Augmentation keyed by sorting ID (for sortTabsWithSections)
      const augData = session.augmentation.get(String(originalTabId))
      if (augData) {
        allAugmentation[String(sortingId)] = augData
      }
    })

    // Collect windows
    session.sessionWindows.forEach((win) => {
      allSessionWindows.push(win)
    })

    // Collect recently closed tabs
    if (session.recentlyClosed) {
      allRecentlyClosed.push(...session.recentlyClosed)
    }

    // Collect other devices
    if (session.otherDevices) {
      allOtherDevices.push(...session.otherDevices)
    }
  })

  // Use the shared sorting module with sections
  const sortedTabs = sortTabsWithSections({
    sessionTabs: allSessionTabs,
    sessionWindows: allSessionWindows,
    augmentation: allAugmentation,
    recentlyClosed: allRecentlyClosed.slice(0, 10), // Limit to 10
    otherDevices: allOtherDevices.slice(0, 5), // Limit to 5 devices
    strategy: appSettingsStore.get('sortStrategy')
  })

  // Post-process: replace sorting IDs with proper display IDs
  displayTabs = sortedTabs.map((tab) => {
    const sortingId = parseInt(tab.id, 10)
    const info = sortingIdToInfo.get(sortingId)

    if (info) {
      return {
        ...tab,
        id: info.displayId,
        browser: info.browserType
      }
    }

    // Session/device tabs (recently closed, other devices) don't need transformation
    return tab
  })

  // Persist to disk (debounced via tabStorage)
  saveTabData(displayTabs)
}

/**
 * Send current displayTabs to all open windows
 */
function broadcastDisplayTabs(): void {
  if (tasWindow && !tasWindow.isDestroyed()) {
    tasWindow.webContents.send('tabs-updated', displayTabs)
  }

  if (tabManagementWindow && !tabManagementWindow.isDestroyed()) {
    tabManagementWindow.webContents.send('tabs-updated', displayTabs)
  }
}

/**
 * Handle snapshot received from a session
 */
function handleSnapshot(_sessionKey: SessionKey, session: Session): void {
  console.log(
    `[TAS] Snapshot received from ${session.browserType}: ${session.sessionTabs.length} tabs`
  )
  // Update tray menu now that session has snapshot (is fully connected)
  updateTrayMenu()
  rebuildDisplayTabs()
  broadcastDisplayTabs()
}

/**
 * Handle event received from a session
 */
function handleEvent(_sessionKey: SessionKey, _session: Session, event: EventPayload): void {
  // For activation events, we want to update immediately
  if (event.event === 'tab.activated') {
    rebuildDisplayTabs()
    broadcastDisplayTabs()
  } else if (
    event.event === 'tab.created' ||
    event.event === 'tab.removed' ||
    event.event === 'tab.updated' ||
    event.event === 'augmentation.updated'
  ) {
    // For tab and augmentation changes (including favicon updates), update display
    rebuildDisplayTabs()
    broadcastDisplayTabs()
  } else if (
    event.event === 'window.created' ||
    event.event === 'window.removed' ||
    event.event === 'window.focused'
  ) {
    // Window changes affect app tab detection and windowGrouped sorting
    rebuildDisplayTabs()
    broadcastDisplayTabs()
  }
}

/**
 * Handle connection changes
 */
function handleConnectionChange(): void {
  updateTrayMenu()
  // When a session connects/disconnects, rebuild display
  rebuildDisplayTabs()
  broadcastDisplayTabs()
}

// Hide dock icon on macOS (menu bar app only)
if (process.platform === 'darwin' && app.dock) {
  app.dock.hide()
}

function createTasOverlay(): void {
  if (tasWindow) {
    // Send cached displayTabs immediately - should be fresh from event updates
    if (displayTabs.length > 0) {
      tasWindow.webContents.send('tabs-updated', displayTabs)
    }
    // Don't request snapshot here - the event system keeps displayTabs up-to-date
    // This avoids flooding when rapidly showing/hiding the overlay
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

    // Send cached displayTabs to the window
    if (tasWindow && displayTabs.length > 0) {
      tasWindow.webContents.send('tabs-updated', displayTabs)
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

function createSettingsWindow(initialTab?: 'keys' | 'options' | 'setup'): void {
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
    width: 650,
    height: 600,
    title: 'Settings - TAS',
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

function createAboutWindow(): void {
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
 * Find the session that owns a tab by parsing its display ID
 * Display IDs are formatted as "instancePrefix:originalTabId" (e.g., "a1b2c3d4:42")
 */
function findSessionForTab(displayTabId: string): {
  session: Session
  sessionKey: SessionKey
  tabId: number
} | null {
  // Parse "prefix:tabId" format
  const colonIndex = displayTabId.indexOf(':')
  if (colonIndex === -1) return null

  const prefix = displayTabId.substring(0, colonIndex)
  const tabId = parseInt(displayTabId.substring(colonIndex + 1), 10)
  if (isNaN(tabId)) return null

  // Find session with matching prefix
  const sessions = getActiveSessions()
  for (const session of sessions) {
    if (session.instanceId.startsWith(prefix)) {
      const sessionKey = `${session.instanceId}:${session.runtimeSessionId}`
      return { session, sessionKey, tabId }
    }
  }

  return null
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.tab-app-switcher')

  // Load persisted tab data from disk for instant startup display
  const persistedData = loadTabData()
  displayTabs = persistedData.displayTabs
  console.log(`[TAS] Restored ${displayTabs.length} tabs from disk on startup`)

  // Start WebSocket server with new session-based callbacks
  startWebSocketServer({
    onConnectionChange: handleConnectionChange,
    onSnapshot: handleSnapshot,
    onEvent: handleEvent
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Create tray icon
  createTray()

  // First-run experience: show Setup tab on first launch
  if (!appSettingsStore.get('hasCompletedFirstRun')) {
    appSettingsStore.set('hasCompletedFirstRun', true)
    createSettingsWindow('setup')
  }

  // Register global keyboard shortcut (Alt+Tab)
  const registered = globalShortcut.register('Alt+Tab', () => {
    createTasOverlay()
  })

  if (!registered) {
    console.error('Failed to register global shortcut Alt+Tab')
  }

  // Setup auto-updater
  setupAutoUpdater()

  // Setup auth handlers
  setupAuthHandlers()

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

  // IPC handler for Settings to get connection status
  ipcMain.handle('get-connection-status', () => {
    const sessions = getActiveSessions()
    return {
      connected: sessions.length > 0,
      sessionCount: sessions.length,
      browsers: sessions.map((s) => ({
        browser: s.browserType,
        tabCount: s.sessionTabs.length
      }))
    }
  })

  // IPC handler for About window
  ipcMain.handle('get-about-info', () => {
    return {
      version: app.getVersion(),
      commitHash: GIT_COMMIT_HASH
    }
  })

  // IPC handlers for app options
  ipcMain.handle('get-app-options', () => {
    return {
      launchOnLogin: appSettingsStore.get('launchOnLogin'),
      hideMenuBarIcon: appSettingsStore.get('hideMenuBarIcon'),
      checkUpdatesAutomatically: appSettingsStore.get('checkUpdatesAutomatically'),
      theme: appSettingsStore.get('theme'),
      sortStrategy: appSettingsStore.get('sortStrategy')
    }
  })

  ipcMain.handle('set-app-option', (_event, key: string, value: unknown) => {
    if (key === 'launchOnLogin' && typeof value === 'boolean') {
      appSettingsStore.set('launchOnLogin', value)
      app.setLoginItemSettings({ openAtLogin: value })
    } else if (key === 'hideMenuBarIcon' && typeof value === 'boolean') {
      appSettingsStore.set('hideMenuBarIcon', value)
      if (tray) {
        if (value) {
          tray.destroy()
          tray = null
        }
      } else if (!value) {
        createTray()
      }
    } else if (key === 'checkUpdatesAutomatically' && typeof value === 'boolean') {
      appSettingsStore.set('checkUpdatesAutomatically', value)
    } else if (key === 'theme' && (value === 'light' || value === 'dark' || value === 'system')) {
      appSettingsStore.set('theme', value)
      // Broadcast theme change to all windows
      const windows = BrowserWindow.getAllWindows()
      windows.forEach((win) => {
        win.webContents.send('theme-changed', value)
      })
    } else if (
      key === 'sortStrategy' &&
      ['lastActivated', 'windowGrouped', 'lastAccessed', 'lastDeactivated'].includes(
        value as string
      )
    ) {
      appSettingsStore.set('sortStrategy', value as SortStrategy)
      // Rebuild with new strategy and broadcast to all windows
      rebuildDisplayTabs()
      broadcastDisplayTabs()
    }
    return true
  })

  ipcMain.on('check-for-updates', () => {
    // Trigger manual update check via autoUpdater
    // The autoUpdater module should export a function for this
    console.log('[TAS] Manual update check requested')
  })

  // Sort strategy sync IPC handlers
  ipcMain.handle('get-sort-sync-status', () => {
    const nativeStrategy = appSettingsStore.get('sortStrategy')
    const sessions = getActiveSessions()

    const sessionStatuses = sessions.map((session) => ({
      browserType: session.browserType,
      strategy: session.sortStrategy,
      inSync: session.sortStrategy === nativeStrategy
    }))

    return {
      nativeStrategy,
      sessions: sessionStatuses,
      allInSync: sessionStatuses.every((s) => s.inSync)
    }
  })

  ipcMain.handle('sync-sort-strategy', () => {
    const nativeStrategy = appSettingsStore.get('sortStrategy')
    const sessions = getActiveSessions()
    let syncedCount = 0

    sessions.forEach((session) => {
      if (session.sortStrategy !== nativeStrategy) {
        const sessionKey = `${session.instanceId}:${session.runtimeSessionId}`
        sendCommand(sessionKey, {
          command: 'setSortStrategy',
          strategy: nativeStrategy
        })
        // Update local tracking (will be confirmed on next connect)
        session.sortStrategy = nativeStrategy
        syncedCount++
      }
    })

    console.log(`[TAS] Synced sort strategy to ${syncedCount} browser(s)`)
    return { syncedCount }
  })

  // Tab management IPC handlers - route to correct session
  ipcMain.on('activate-tab', (_event, tabId: string, browser?: BrowserType) => {
    const found = findSessionForTab(tabId)

    if (found) {
      // Send command to the correct session
      sendCommand(found.sessionKey, {
        command: 'activateTab',
        tabId: found.tabId,
        windowId: 0 // Extension will look up the window
      })

      // Activate the browser application
      activateBrowserApp(found.session.browserType)
    } else {
      // Fallback: try to find in displayTabs and use browser hint
      const tab = displayTabs.find((t) => t.id === tabId)
      const targetBrowser = browser || tab?.browser || 'chrome'

      // Extract numeric tab ID (legacy format)
      const numericTabId = parseInt(tabId.split(':').pop() || tabId, 10)
      if (!isNaN(numericTabId)) {
        // Send to all sessions of this browser type
        const sessions = getActiveSessions().filter((s) => s.browserType === targetBrowser)
        sessions.forEach((session) => {
          const sessionKey = `${session.instanceId}:${session.runtimeSessionId}`
          sendCommand(sessionKey, {
            command: 'activateTab',
            tabId: numericTabId,
            windowId: 0
          })
        })
        activateBrowserApp(targetBrowser)
      }
    }
  })

  ipcMain.on('close-tab', (_event, tabId: string, browser?: BrowserType) => {
    const found = findSessionForTab(tabId)

    if (found) {
      sendCommand(found.sessionKey, {
        command: 'closeTab',
        tabId: found.tabId
      })
    } else {
      // Fallback: try to find in displayTabs
      const tab = displayTabs.find((t) => t.id === tabId)
      const targetBrowser = browser || tab?.browser || 'chrome'

      const numericTabId = parseInt(tabId.split(':').pop() || tabId, 10)
      if (!isNaN(numericTabId)) {
        const sessions = getActiveSessions().filter((s) => s.browserType === targetBrowser)
        sessions.forEach((session) => {
          const sessionKey = `${session.instanceId}:${session.runtimeSessionId}`
          sendCommand(sessionKey, {
            command: 'closeTab',
            tabId: numericTabId
          })
        })
      }
    }
  })

  // Send displayTabs when requested
  ipcMain.on('request-tabs', (event) => {
    console.log('[TAS] Tab Management requested tabs, sending:', displayTabs.length, 'tabs')
    event.sender.send('tabs-updated', displayTabs)
  })

  // Refresh tabs: send refresh command to all connected sessions
  ipcMain.on('refresh-tabs', () => {
    console.log('[TAS] Refresh tabs requested')
    const sessions = getActiveSessions()
    sessions.forEach((session) => {
      const sessionKey = `${session.instanceId}:${session.runtimeSessionId}`
      sendCommand(sessionKey, { command: 'refresh' })
    })
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
