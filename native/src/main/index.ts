/**
 * Main Process Entry Point
 * Orchestrates the Electron app lifecycle and wires up modules
 */

import { app, globalShortcut, Notification, systemPreferences } from 'electron'
import { uIOhook, UiohookKey } from 'uiohook-napi'
import Store from 'electron-store'
import { exec } from 'child_process'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import {
  startWebSocketServer,
  getActiveSessions,
  cleanupStaleSessions,
  type Session,
  type SessionKey
} from './websocketServer'
import { setupAutoUpdater } from './autoUpdater'
import { handleAuthRequest, setupAuthHandlers } from './auth'
import { loadTabData, saveTabData, flushTabData } from './tabStorage'
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
import { DEFAULT_KEYBOARD_SETTINGS, type KeyboardSettings } from '@tas/keyboard'

// Import extracted modules
import {
  initWindows,
  prepareTasOverlay,
  showTasOverlay,
  createSettingsWindow,
  getTasWindow,
  getTabManagementWindow,
  isTasOverlayActive,
  isTasSearchActive,
  selectCurrentTabAndHide
} from './windows'
import { createTray, updateTrayMenu, destroyTray } from './tray'
import {
  registerTasNavigationShortcuts,
  unregisterTasNavigationShortcuts,
  updateKeyboardSettings,
  initKeyboardSettings,
  getKeyboardSettings,
  initActivationShortcut,
  registerActivationShortcut,
  unregisterActivationShortcut
} from './shortcuts'
import { registerIpcHandlers, browserAppNames, setAppOption } from './ipc'

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
  keyboard: KeyboardSettings
}

const appSettingsStore = new Store<AppSettingsSchema>({
  name: 'app-settings',
  defaults: {
    hasCompletedFirstRun: false,
    launchOnLogin: false,
    hideMenuBarIcon: false,
    checkUpdatesAutomatically: true,
    theme: 'system',
    sortStrategy: 'lastActivated',
    keyboard: DEFAULT_KEYBOARD_SETTINGS
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
  return `${displayIdPrefix(session)}:${tabId}`
}

function displayIdPrefix(session: Session): string {
  return session.instanceId.substring(0, 8)
}

// Window ids from different browsers (or browser profiles) can be the same number, so each
// (session, window) pair gets its own display window id, kept stable across rebuilds.
const displayWindowIds = new Map<string, number>()
const originalWindowIds = new Map<number, { prefix: string; windowId: number }>()

function toDisplayWindowId(session: Session, windowId: number): number {
  const prefix = displayIdPrefix(session)
  const key = `${prefix}:${windowId}`
  let id = displayWindowIds.get(key)
  if (id === undefined) {
    id = displayWindowIds.size + 1
    displayWindowIds.set(key, id)
    originalWindowIds.set(id, { prefix, windowId })
  }
  return id
}

/** The browser's own id for a display window id, if that window belongs to `session` */
function toBrowserWindowId(session: Session, displayWindowId: number): number | undefined {
  const original = originalWindowIds.get(displayWindowId)
  return original?.prefix === displayIdPrefix(session) ? original.windowId : undefined
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
        id: sortingId,
        windowId: toDisplayWindowId(session, browserTab.windowId)
      })

      // Augmentation keyed by sorting ID (for sortTabsWithSections)
      const augData = session.augmentation.get(String(originalTabId))
      if (augData) {
        allAugmentation[String(sortingId)] = augData
      }
    })

    // Collect windows
    session.sessionWindows.forEach((win) => {
      if (win.id === undefined) return
      allSessionWindows.push({ ...win, id: toDisplayWindowId(session, win.id) })
    })

    // Collect recently closed tabs and other devices. Their session ids get the browser
    // session's prefix, so opening one can be sent back to the browser it came from.
    const prefix = displayIdPrefix(session)
    const withOwner = (tab: SessionTab): SessionTab => ({
      ...tab,
      sessionId: `${prefix}:${tab.sessionId}`
    })
    if (session.recentlyClosed) {
      allRecentlyClosed.push(...session.recentlyClosed.map(withOwner))
    }
    if (session.otherDevices) {
      allOtherDevices.push(
        ...session.otherDevices.map((device) => ({
          ...device,
          tabs: device.tabs.map(withOwner)
        }))
      )
    }
  })
  allRecentlyClosed.sort((a, b) => b.lastModified - a.lastModified)

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

    // Recently closed and other devices rows: "session:<prefix>:<sessionId>"
    const owner = tab.sessionId && findSessionForRestore(tab.id)
    return owner ? { ...tab, browser: owner.session.browserType } : tab
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
    event.event === 'tabs.moved' ||
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

/**
 * Find the browser session a Recently Closed or Other Devices row came from.
 * Their display IDs are "session:<instancePrefix>:<sessionId>" (see rebuildDisplayTabs).
 */
function findSessionForRestore(displayTabId: string): {
  session: Session
  sessionKey: string
  sessionId: string
} | null {
  const match = /^session:([^:]+):(.+)$/.exec(displayTabId)
  if (!match) return null
  const [, prefix, sessionId] = match
  const session = getActiveSessions().find((s) => s.instanceId.startsWith(prefix))
  if (!session) return null
  return { session, sessionKey: `${session.instanceId}:${session.runtimeSessionId}`, sessionId }
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

// One copy of the app at a time: a second copy couldn't get the shortcut or the WebSocket port.
// Opening the app again shows its settings instead.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => createSettingsWindow())
  app.whenReady().then(startApp)
}

// The modifier key's left and right key codes, for noticing when it's released
const MODIFIER_KEYCODES: Record<string, number[]> = {
  Alt: [UiohookKey.Alt, UiohookKey.AltRight],
  Cmd: [UiohookKey.Meta, UiohookKey.MetaRight],
  Ctrl: [UiohookKey.Ctrl, UiohookKey.CtrlRight],
  Shift: [UiohookKey.Shift, UiohookKey.ShiftRight]
}

/** A shortcut as people write it, from an Electron accelerator ("Option+Tab" on a Mac) */
function shortcutLabel(accelerator: string): string {
  return process.platform === 'darwin'
    ? accelerator.replace('Alt', 'Option').replace('Cmd', 'Command')
    : accelerator
}

function startApp(): void {
  electronApp.setAppUserModelId('com.tab-app-switcher')

  // Check accessibility permissions on macOS (needed for global shortcuts)
  checkAccessibilityPermissions()

  // Initialize keyboard settings from store before registering shortcuts
  initKeyboardSettings(appSettingsStore.get('keyboard'))

  // Initialize windows module with dependencies
  initWindows({
    registerTasNavigationShortcuts,
    unregisterTasNavigationShortcuts,
    registerActivationShortcut,
    unregisterActivationShortcut
  })

  // Set up uIOhook for modifier key release detection
  // This allows us to select the current tab when the user releases Alt (like native Alt+Tab)
  uIOhook.on('keyup', (e) => {
    const modifierKeys = MODIFIER_KEYCODES[getKeyboardSettings().modifier] ?? MODIFIER_KEYCODES.Alt
    if (modifierKeys.includes(e.keycode) && isTasOverlayActive() && !isTasSearchActive()) {
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
    onEvent: handleEvent,
    // The browser comes back here after sign-in
    onHttpRequest: handleAuthRequest
  })

  // The end-to-end tests (e2e/) launch the app with TAS_E2E=1 and read its state through this.
  if (process.env.TAS_E2E === '1') {
    Object.assign(globalThis, {
      __tasE2E: {
        sessions: () =>
          getActiveSessions().map((s) => ({
            browserType: s.browserType,
            instanceId: s.instanceId,
            tabCount: s.sessionTabs.length
          })),
        displayTabs: () => getDisplayTabs(),
        setAppOption
      }
    })
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Create tray icon
  createTray()

  // Load the switcher overlay now, hidden, so the first Alt+Tab shows it right away
  prepareTasOverlay()

  // First-run experience: show Setup tab on first launch
  if (!appSettingsStore.get('hasCompletedFirstRun')) {
    appSettingsStore.set('hasCompletedFirstRun', true)
    createSettingsWindow('setup')
  }

  // Register the shortcut that opens the overlay (Alt+Tab unless changed in settings), and
  // say so if another app already has it, since the app does nothing without it
  initActivationShortcut({
    onActivate: showTasOverlay,
    onUnavailable: (accelerator) => {
      if (!Notification.isSupported()) return
      new Notification({
        title: `${shortcutLabel(accelerator)} isn't available`,
        body: 'Another app is using this shortcut, so it can’t open Tab Application Switcher. Choose a different shortcut in Settings.'
      }).show()
    }
  })
  registerActivationShortcut()

  // Forget browser sessions that have been gone for a day (browser restarts make new ones)
  setInterval(() => cleanupStaleSessions(), 60 * 60 * 1000)

  // Setup auto-updater
  setupAutoUpdater({
    onUpdateReady: updateTrayMenu,
    checkAutomatically: () => appSettingsStore.get('checkUpdatesAutomatically')
  })

  // Setup auth handlers
  setupAuthHandlers()

  // Register IPC handlers with dependencies
  registerIpcHandlers({
    appSettingsStore,
    getDisplayTabs,
    findSessionForTab,
    findSessionForRestore,
    toBrowserWindowId,
    rebuildDisplayTabs,
    broadcastDisplayTabs,
    activateBrowserApp,
    updateKeyboardShortcuts: updateKeyboardSettings
  })
}

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
  flushTabData()

  // Stop uIOhook
  uIOhook.stop()

  // Unregister all shortcuts
  globalShortcut.unregisterAll()

  // Destroy tray icon
  destroyTray()
})
