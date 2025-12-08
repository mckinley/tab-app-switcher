import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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
