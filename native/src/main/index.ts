/**
 * Main Process Entry Point
 * Orchestrates the Electron app lifecycle and wires up modules
 */

import { app, globalShortcut, systemPreferences } from 'electron'
import { uIOhook, UiohookKey } from 'uiohook-napi'
import Store from 'electron-store'
import { exec } from 'child_process'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import {
  startWebSocketServer,
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

// Import extracted modules
import {
  initWindows,
  createTasOverlay,
  createSettingsWindow,
  getTasWindow,
  getTabManagementWindow,
  isTasOverlayActive,
  selectCurrentTabAndHide
} from './windows'
import { createTray, updateTrayMenu, destroyTray } from './tray'
import { registerTasNavigationShortcuts, unregisterTasNavigationShortcuts } from './shortcuts'
import { registerIpcHandlers, browserAppNames } from './ipc'

// =============================================================================
// App Settings Store
// =============================================================================

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

// =============================================================================
// Display Tabs Cache
// =============================================================================

// Display-ready tabs cache (pre-sorted, ready for immediate display)
let displayTabs: Tab[] = []

/**
 * Get the current display tabs
 */
function getDisplayTabs(): Tab[] {
  return displayTabs
}

/**
 * Build a display ID from session and tab ID
 * Format: "instancePrefix:originalTabId" (e.g., "a1b2c3d4:42")
 */
function buildDisplayId(session: Session, tabId: number): string {
  return `${session.instanceId.substring(0, 8)}:${tabId}`
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

  // Use a simple incrementing counter for sortingId to guarantee uniqueness
  // This avoids collisions from the previous hash-based approach
  let sortingIdCounter = 1

  sessions.forEach((session) => {
    session.sessionTabs.forEach((browserTab) => {
      const originalTabId = browserTab.id
      if (originalTabId === undefined) return

      // Create a unique numeric ID for sorting (simple counter guarantees no collisions)
      const sortingId = sortingIdCounter++

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
  const tasWindow = getTasWindow()
  const tabManagementWindow = getTabManagementWindow()

  if (tasWindow && !tasWindow.isDestroyed()) {
    tasWindow.webContents.send('tabs-updated', displayTabs)
  }

  if (tabManagementWindow && !tabManagementWindow.isDestroyed()) {
    tabManagementWindow.webContents.send('tabs-updated', displayTabs)
  }
}

// =============================================================================
// Session Event Handlers
// =============================================================================

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

// =============================================================================
// Tab Lookup
// =============================================================================

/**
 * Find the session that owns a tab by parsing its display ID
 * Display IDs are formatted as "instancePrefix:originalTabId" (e.g., "a1b2c3d4:42")
 */
function findSessionForTab(displayTabId: string): {
  session: Session
  sessionKey: string
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

// =============================================================================
// Browser Activation (macOS AppleScript)
// =============================================================================

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

// =============================================================================
// Accessibility Permissions (macOS)
// =============================================================================

// Hide dock icon on macOS (menu bar app only)
if (process.platform === 'darwin' && app.dock) {
  app.dock.hide()
}

/**
 * Check if the app has Accessibility permissions on macOS.
 * This is required for global shortcuts like Tab/Enter to work when our window doesn't have focus.
 * If not trusted, opens System Preferences to the Accessibility pane.
 */
function checkAccessibilityPermissions(): boolean {
  if (process.platform !== 'darwin') {
    return true // Not needed on other platforms
  }

  // Check if trusted, and if not, prompt user by opening System Preferences
  const trusted = systemPreferences.isTrustedAccessibilityClient(true)

  if (!trusted) {
    console.log('[TAS] Accessibility permissions not granted. Opening System Preferences...')
    console.log('[TAS] In dev mode, grant access to "Electron" or your terminal app')
    console.log('[TAS] The app binary is typically at: node_modules/electron/dist/Electron.app')
  } else {
    console.log('[TAS] Accessibility permissions granted')
  }

  return trusted
}

// =============================================================================
// App Initialization
// =============================================================================

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.tab-app-switcher')

  // Check accessibility permissions on macOS (needed for global shortcuts)
  checkAccessibilityPermissions()

  // Initialize windows module with dependencies
  initWindows({
    getDisplayTabs,
    registerTasNavigationShortcuts,
    unregisterTasNavigationShortcuts
  })

  // Set up uIOhook for Alt key release detection
  // This allows us to select the current tab when the user releases Alt (like native Alt+Tab)
  uIOhook.on('keyup', (e) => {
    // Alt key codes: 56 = Left Alt, 3640 = Right Alt (AltGr)
    if (
      (e.keycode === UiohookKey.Alt || e.keycode === UiohookKey.AltRight) &&
      isTasOverlayActive()
    ) {
      selectCurrentTabAndHide()
    }
  })
  uIOhook.start()

  // Load persisted tab data from disk for instant startup display
  const persistedData = loadTabData()
  displayTabs = persistedData.displayTabs

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

  // Register IPC handlers with dependencies
  registerIpcHandlers({
    appSettingsStore,
    getDisplayTabs,
    findSessionForTab,
    rebuildDisplayTabs,
    broadcastDisplayTabs,
    activateBrowserApp
  })
})

// =============================================================================
// App Lifecycle
// =============================================================================

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
  // Stop uIOhook
  uIOhook.stop()

  // Unregister all shortcuts
  globalShortcut.unregisterAll()

  // Destroy tray icon
  destroyTray()
})
