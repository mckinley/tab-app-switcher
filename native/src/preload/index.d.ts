import { ElectronAPI } from '@electron-toolkit/preload'

interface AuthAPI {
  getToken: () => Promise<string | null>
  /** Opens sign-in in the browser; resolves once signed in */
  signIn: () => Promise<void>
  clearToken: () => Promise<void>
  /** Calls back when the token changes; returns an unsubscribe function */
  onChange: (callback: () => void) => () => void
}

interface ConnectionStatus {
  connected: boolean
  sessionCount: number
  browsers: Array<{
    browser: string
    tabCount: number
  }>
}

interface SettingsAPI {
  getConnectionStatus: () => Promise<ConnectionStatus>
  onSwitchTab: (callback: (tab: 'keys' | 'options' | 'setup') => void) => void
}

interface AboutInfo {
  version: string
  commitHash: string
}

interface AboutAPI {
  getAboutInfo: () => Promise<AboutInfo>
}

interface KeyboardSettings {
  modifier: string
  activateForward: string
  activateBackward: string
  closeTab: string
  search: string
  tabManagement?: string
}

interface AppOptions {
  launchOnLogin: boolean
  hideMenuBarIcon: boolean
  checkUpdatesAutomatically: boolean
  theme: 'light' | 'dark' | 'system'
  sortStrategy: 'lastActivated' | 'windowGrouped' | 'lastAccessed' | 'lastDeactivated'
  keyboard: KeyboardSettings
}

type UpdateStatus = import('@tas/types/updates').UpdateStatus

interface OptionsAPI {
  getAppOptions: () => Promise<AppOptions>
  setAppOption: (key: string, value: unknown) => Promise<boolean>
  checkForUpdates: () => Promise<UpdateStatus>
  installUpdate: () => void
  onThemeChanged: (callback: (theme: 'light' | 'dark' | 'system') => void) => void
  onKeyboardChanged: (callback: (keyboard: KeyboardSettings) => void) => void
  onSortStrategyChanged: (
    callback: (strategy: 'lastActivated' | 'windowGrouped' | 'lastAccessed' | 'lastDeactivated') => void
  ) => void
}

interface SortSyncStatus {
  nativeStrategy: string
  sessions: Array<{
    browserType: string
    strategy?: string
    inSync: boolean
  }>
  allInSync: boolean
}

interface SortingAPI {
  getSyncStatus: () => Promise<SortSyncStatus>
  syncSortStrategy: () => Promise<{ syncedCount: number }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      auth: AuthAPI
      settings: SettingsAPI
      about: AboutAPI
      options: OptionsAPI
      sorting: SortingAPI
    }
  }
}
