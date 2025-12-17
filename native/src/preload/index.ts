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

// App options type
interface AppOptions {
  launchOnLogin: boolean
  hideMenuBarIcon: boolean
  checkUpdatesAutomatically: boolean
  theme: 'light' | 'dark' | 'system'
}

// Custom APIs for renderer
const api = {
  auth: {
    signIn: (): void => ipcRenderer.send('auth-sign-in'),
    signOut: (): void => ipcRenderer.send('auth-sign-out'),
    onTokens: (callback: (tokens: { accessToken: string; refreshToken: string }) => void): void => {
      ipcRenderer.on('auth-tokens', (_event, tokens) => callback(tokens))
    },
    onSignedOut: (callback: () => void): void => {
      ipcRenderer.on('auth-signed-out', () => callback())
    },
    onError: (callback: (error: string) => void): void => {
      ipcRenderer.on('auth-error', (_event, error) => callback(error))
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
    checkForUpdates: (): void => ipcRenderer.send('check-for-updates'),
    onThemeChanged: (callback: (theme: 'light' | 'dark' | 'system') => void): void => {
      ipcRenderer.on('theme-changed', (_event, theme) => callback(theme))
    }
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
