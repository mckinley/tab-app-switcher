import { ElectronAPI } from '@electron-toolkit/preload'

interface AuthAPI {
  signIn: () => void
  signOut: () => void
  onTokens: (callback: (tokens: { accessToken: string; refreshToken: string }) => void) => void
  onSignedOut: (callback: () => void) => void
  onError: (callback: (error: string) => void) => void
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

interface AppOptions {
  launchOnLogin: boolean
  hideMenuBarIcon: boolean
  checkUpdatesAutomatically: boolean
  theme: 'light' | 'dark' | 'system'
  sortStrategy: 'lastActivated' | 'windowGrouped' | 'lastAccessed' | 'lastDeactivated'
}

interface OptionsAPI {
  getAppOptions: () => Promise<AppOptions>
  setAppOption: (key: string, value: unknown) => Promise<boolean>
  checkForUpdates: () => void
  onThemeChanged: (callback: (theme: 'light' | 'dark' | 'system') => void) => void
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
