/**
 * IPC Handlers Module
 * Registers all ipcMain handlers for renderer-main communication
 */

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import Store from 'electron-store'
import { getActiveSessions, sendCommand, type Session } from './websocketServer'
import {
  hideTasOverlay,
  createSettingsWindow,
  createTabManagementWindow,
  setTasOverlayActive
} from './windows'
import { createTray, destroyTray, getTray } from './tray'
import { checkForUpdatesNow, installUpdate } from './autoUpdater'
import type { Tab, BrowserType } from '@tas/types/tabs'
import type { SortStrategy } from '@tas/sorting'
import type { KeyboardSettings } from '@tas/keyboard'

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

// Dependencies injected from main
interface IpcDependencies {
  appSettingsStore: Store<AppSettingsSchema>
  getDisplayTabs: () => Tab[]
  findSessionForTab: (displayTabId: string) => {
    session: Session
    sessionKey: string
    tabId: number
  } | null
  toBrowserWindowId: (session: Session, displayWindowId: number) => number | undefined
  findSessionForRestore: (displayTabId: string) => {
    session: Session
    sessionKey: string
    sessionId: string
  } | null
  rebuildDisplayTabs: () => void
  broadcastDisplayTabs: () => void
  activateBrowserApp: (browser: BrowserType) => void
  updateKeyboardShortcuts: (keyboard: KeyboardSettings) => void
}

interface AppSettingsSchema {
  hasCompletedFirstRun: boolean
  launchOnLogin: boolean
  hideMenuBarIcon: boolean
  checkUpdatesAutomatically: boolean
  theme: 'light' | 'dark' | 'system'
  sortStrategy: SortStrategy
  keyboard: KeyboardSettings
}

let deps: IpcDependencies | null = null

/** Requests from the Tab Management window (NativeTabManagementAdapter) */
type TabManagementCommand =
  | { command: 'reorderTab'; tabId: string; newIndex: number; targetWindowId?: number }
  | { command: 'createWindow'; urls: string[] }

/**
 * Initialize IPC handlers with dependencies
 */
export function registerIpcHandlers(dependencies: IpcDependencies): void {
  deps = dependencies
  const { appSettingsStore, getDisplayTabs, findSessionForTab, activateBrowserApp } = deps

  // Basic handlers
  ipcMain.on('ping', () => {
    // No-op: ping handler for keep-alive
  })

  ipcMain.on('hide-tas', () => {
    // Use the proper hide function to clean up state (including tasOverlayActive)
    hideTasOverlay()
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
      sortStrategy: appSettingsStore.get('sortStrategy'),
      keyboard: appSettingsStore.get('keyboard')
    }
  })

  ipcMain.handle('set-app-option', (_event, key: string, value: unknown) =>
    setAppOption(key, value)
  )

  ipcMain.handle('check-for-updates', () => checkForUpdatesNow())

  ipcMain.on('install-update', () => installUpdate())

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

    return { syncedCount }
  })

  // Tab management IPC handlers - route to the browser session that owns the tab. A tab
  // whose session isn't connected is left alone: sending its id to other browser profiles
  // could switch to or close a different tab there.
  ipcMain.on('activate-tab', (_event, tabId: string) => {
    // Immediately disable Alt-release behavior since a selection was made
    // This prevents double-triggering if user releases Alt after clicking
    setTasOverlayActive(false)

    const found = findSessionForTab(tabId)
    if (found) {
      sendCommand(found.sessionKey, {
        command: 'activateTab',
        tabId: found.tabId,
        windowId: 0 // Extension will look up the window
      })
      activateBrowserApp(found.session.browserType)
      return
    }

    // A Recently Closed or Other Devices row
    const owner = deps?.findSessionForRestore(tabId)
    if (owner?.session.commands.includes('restoreSession')) {
      sendCommand(owner.sessionKey, { command: 'restoreSession', sessionId: owner.sessionId })
      activateBrowserApp(owner.session.browserType)
      return
    }
    // Older extensions can't restore sessions; open the page instead
    const tab = getDisplayTabs().find((t) => t.id === tabId)
    if (owner && tab && /^https?:/.test(tab.url)) {
      shell.openExternal(tab.url)
      return
    }
    console.warn(`[TAS] No connected browser has tab ${tabId}`)
  })

  ipcMain.on('close-tab', (_event, tabId: string) => {
    const found = findSessionForTab(tabId)
    if (found) {
      sendCommand(found.sessionKey, { command: 'closeTab', tabId: found.tabId })
    } else {
      console.warn(`[TAS] No connected browser has tab ${tabId}`)
    }
  })

  // Tab Management window: move a tab, or open a collection in a new window
  ipcMain.on('command-to-extension', (_event, request: TabManagementCommand) => {
    if (request.command === 'reorderTab') {
      const found = findSessionForTab(request.tabId)
      if (!found?.session.commands.includes('moveTab')) return
      // A tab can only move between windows of its own browser profile
      const windowId =
        request.targetWindowId === undefined
          ? undefined
          : deps?.toBrowserWindowId(found.session, request.targetWindowId)
      if (request.targetWindowId !== undefined && windowId === undefined) return
      sendCommand(found.sessionKey, {
        command: 'moveTab',
        tabId: found.tabId,
        index: request.newIndex,
        windowId
      })
    } else if (request.command === 'createWindow') {
      // In the browser the person used last, if it can
      const recent = getDisplayTabs()
        .map((tab) => findSessionForTab(tab.id))
        .find((owner) => owner?.session.commands.includes('createWindow'))
      if (recent) {
        sendCommand(recent.sessionKey, { command: 'createWindow', urls: request.urls })
        activateBrowserApp(recent.session.browserType)
      } else {
        request.urls.filter((url) => /^https?:/.test(url)).forEach((url) => shell.openExternal(url))
      }
    }
  })

  // Send displayTabs when requested
  ipcMain.on('request-tabs', (event) => {
    event.sender.send('tabs-updated', getDisplayTabs())
  })

  // Refresh tabs: send refresh command to all connected sessions
  ipcMain.on('refresh-tabs', () => {
    const sessions = getActiveSessions()
    sessions.forEach((session) => {
      const sessionKey = `${session.instanceId}:${session.runtimeSessionId}`
      sendCommand(sessionKey, { command: 'refresh' })
    })
  })
}

// Re-export browserAppNames for use by activateBrowserApp in index.ts
export { browserAppNames }

/**
 * Change one app setting, from the settings window (or the end-to-end tests). Applies it
 * right away and tells every window.
 */
export function setAppOption(key: string, value: unknown): boolean {
  if (!deps) return false
  const { appSettingsStore } = deps
  if (key === 'launchOnLogin' && typeof value === 'boolean') {
    appSettingsStore.set('launchOnLogin', value)
    app.setLoginItemSettings({ openAtLogin: value })
  } else if (key === 'hideMenuBarIcon' && typeof value === 'boolean') {
    appSettingsStore.set('hideMenuBarIcon', value)
    const tray = getTray()
    if (tray) {
      if (value) {
        destroyTray()
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
    ['lastActivated', 'windowGrouped', 'lastAccessed', 'lastDeactivated'].includes(value as string)
  ) {
    appSettingsStore.set('sortStrategy', value as SortStrategy)
    // Rebuild with new strategy and broadcast to all windows
    deps?.rebuildDisplayTabs()
    deps?.broadcastDisplayTabs()
    // Broadcast sort strategy change to all windows
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      win.webContents.send('sort-strategy-changed', value)
    })
  } else if (key === 'keyboard' && typeof value === 'object' && value !== null) {
    const keyboard = value as KeyboardSettings
    appSettingsStore.set('keyboard', keyboard)
    // Update global shortcuts with new keyboard settings
    deps?.updateKeyboardShortcuts(keyboard)
    // Broadcast keyboard change to all windows
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      win.webContents.send('keyboard-changed', keyboard)
    })
  }
  return true
}
