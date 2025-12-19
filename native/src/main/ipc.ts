/**
 * IPC Handlers Module
 * Registers all ipcMain handlers for renderer-main communication
 */

import { app, BrowserWindow, ipcMain } from 'electron'
import Store from 'electron-store'
import { getActiveSessions, sendCommand, type Session } from './websocketServer'
import {
  hideTasOverlay,
  createSettingsWindow,
  createTabManagementWindow,
  setTasOverlayActive
} from './windows'
import { createTray, destroyTray, getTray } from './tray'
import type { Tab, BrowserType } from '@tas/types/tabs'
import type { SortStrategy } from '@tas/sorting'

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
  rebuildDisplayTabs: () => void
  broadcastDisplayTabs: () => void
  activateBrowserApp: (browser: BrowserType) => void
}

interface AppSettingsSchema {
  hasCompletedFirstRun: boolean
  launchOnLogin: boolean
  hideMenuBarIcon: boolean
  checkUpdatesAutomatically: boolean
  theme: 'light' | 'dark' | 'system'
  sortStrategy: SortStrategy
}

let deps: IpcDependencies | null = null

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
      sortStrategy: appSettingsStore.get('sortStrategy')
    }
  })

  ipcMain.handle('set-app-option', (_event, key: string, value: unknown) => {
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
      ['lastActivated', 'windowGrouped', 'lastAccessed', 'lastDeactivated'].includes(
        value as string
      )
    ) {
      appSettingsStore.set('sortStrategy', value as SortStrategy)
      // Rebuild with new strategy and broadcast to all windows
      deps?.rebuildDisplayTabs()
      deps?.broadcastDisplayTabs()
    }
    return true
  })

  ipcMain.on('check-for-updates', () => {
    // Trigger manual update check via autoUpdater
    // The autoUpdater module should export a function for this
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

    return { syncedCount }
  })

  // Tab management IPC handlers - route to correct session
  ipcMain.on('activate-tab', (_event, tabId: string, browser?: BrowserType) => {
    // Immediately disable Alt-release behavior since a selection was made
    // This prevents double-triggering if user releases Alt after clicking
    setTasOverlayActive(false)

    const found = findSessionForTab(tabId)
    const displayTabs = getDisplayTabs()

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
    const displayTabs = getDisplayTabs()

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
