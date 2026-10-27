import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Connection status type
interface ConnectionStatus {
  connected: boolean
  sessionCount: number
  browsers: Array<{
    browser: string
    tabCount: number
  }>
}

// About info type
interface AboutInfo {
  version: string
  commitHash: string
}

// Update check result (matches @tas/types/updates UpdateStatus)
type UpdateStatus =
  | { state: 'unavailable' | 'error'; message: string }
  | { state: 'up-to-date' | 'downloading' | 'ready'; version: string }

// Keyboard settings type (matches @tas/types/tabs KeyboardSettings)
interface KeyboardSettings {
  modifier: string
  activateForward: string
  activateBackward: string
  closeTab: string
  search: string
  tabManagement?: string
}

// App options type
interface AppOptions {
  launchOnLogin: boolean
  hideMenuBarIcon: boolean
  checkUpdatesAutomatically: boolean
  theme: 'light' | 'dark' | 'system'
  sortStrategy: 'lastActivated' | 'windowGrouped' | 'lastAccessed' | 'lastDeactivated'
  keyboard: KeyboardSettings
}

// Sort sync status type
interface SortSyncStatus {
  nativeStrategy: string
  sessions: Array<{
    browserType: string
    strategy?: string
    inSync: boolean
  }>
  allInSync: boolean
}

// Custom APIs for renderer
const api = {
  auth: {
    getToken: (): Promise<string | null> => ipcRenderer.invoke('auth:get-token'),
    // Resolves once the browser comes back signed in
    signIn: async (): Promise<void> => {
      const { error } = await ipcRenderer.invoke('auth:sign-in')
      if (error) throw new Error(error)
    },
    clearToken: (): Promise<void> => ipcRenderer.invoke('auth:clear-token'),
    onChange: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('auth-changed', listener)
      return () => ipcRenderer.removeListener('auth-changed', listener)
    }
  },
  settings: {
    getConnectionStatus: (): Promise<ConnectionStatus> =>
      ipcRenderer.invoke('get-connection-status'),
    onSwitchTab: (callback: (tab: 'keys' | 'options' | 'setup') => void): void => {
      ipcRenderer.on('switch-tab', (_event, tab) => callback(tab))
    }
  },
  about: {
    getAboutInfo: (): Promise<AboutInfo> => ipcRenderer.invoke('get-about-info')
  },
  options: {
    getAppOptions: (): Promise<AppOptions> => ipcRenderer.invoke('get-app-options'),
    setAppOption: (key: string, value: unknown): Promise<boolean> =>
      ipcRenderer.invoke('set-app-option', key, value),
    checkForUpdates: (): Promise<UpdateStatus> => ipcRenderer.invoke('check-for-updates'),
    installUpdate: (): void => ipcRenderer.send('install-update'),
    onThemeChanged: (callback: (theme: 'light' | 'dark' | 'system') => void): void => {
      ipcRenderer.on('theme-changed', (_event, theme) => callback(theme))
    },
    onKeyboardChanged: (callback: (keyboard: KeyboardSettings) => void): void => {
      ipcRenderer.on('keyboard-changed', (_event, keyboard) => callback(keyboard))
    },
    onSortStrategyChanged: (
      callback: (
        strategy: 'lastActivated' | 'windowGrouped' | 'lastAccessed' | 'lastDeactivated'
      ) => void
    ): void => {
      ipcRenderer.on('sort-strategy-changed', (_event, strategy) => callback(strategy))
    }
  },
  sorting: {
    getSyncStatus: (): Promise<SortSyncStatus> => ipcRenderer.invoke('get-sort-sync-status'),
    syncSortStrategy: (): Promise<{ syncedCount: number }> =>
      ipcRenderer.invoke('sync-sort-strategy')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI
  // @ts-expect-error (define in dts)
  window.api = api
}
