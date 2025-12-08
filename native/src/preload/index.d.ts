import { ElectronAPI } from '@electron-toolkit/preload'

interface AuthAPI {
  signIn: () => void
  signOut: () => void
  onTokens: (callback: (tokens: { accessToken: string; refreshToken: string }) => void) => void
  onSignedOut: (callback: () => void) => void
  onError: (callback: (error: string) => void) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      auth: AuthAPI
    }
  }
}
