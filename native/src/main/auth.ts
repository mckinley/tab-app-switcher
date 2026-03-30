import { BrowserWindow, ipcMain, session } from 'electron'

const API_BASE = 'https://tabappswitcher.com'
const CALLBACK_URL = `${API_BASE}/auth/callback`

let authWindow: BrowserWindow | null = null

/**
 * Check if a URL is our OAuth callback
 */
function isAuthCallback(url: string): boolean {
  return url.startsWith(CALLBACK_URL)
}

/**
 * Open OAuth window and handle the redirect to capture the bearer token
 */
function openAuthWindow(parentWindow: BrowserWindow | null): void {
  if (authWindow) {
    authWindow.focus()
    return
  }

  authWindow = new BrowserWindow({
    width: 500,
    height: 700,
    parent: parentWindow || undefined,
    modal: false,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // Better Auth social sign-in URL
  const authUrl = `${API_BASE}/api/auth/sign-in/social?provider=google&callbackURL=${encodeURIComponent(CALLBACK_URL)}`

  // Listen for navigation to capture the redirect after OAuth completes
  authWindow.webContents.on('will-redirect', (_event, url) => {
    if (isAuthCallback(url)) {
      handleAuthCallback()
      authWindow?.close()
    }
  })

  authWindow.webContents.on('will-navigate', (_event, url) => {
    if (isAuthCallback(url)) {
      handleAuthCallback()
      authWindow?.close()
    }
  })

  authWindow.on('closed', () => {
    authWindow = null
  })

  authWindow.loadURL(authUrl)
}

/**
 * After OAuth callback, extract the session token from cookies and send to renderers
 */
async function handleAuthCallback(): Promise<void> {
  try {
    // Better Auth sets a session cookie — read it from the auth window's session
    const cookies = await session.defaultSession.cookies.get({ url: API_BASE })
    const sessionCookie = cookies.find((c) => c.name === 'better-auth.session_token')

    if (sessionCookie) {
      const bearerToken = sessionCookie.value

      // Send bearer token to all renderer windows (except the auth window)
      const windows = BrowserWindow.getAllWindows().filter((win) => win !== authWindow)
      windows.forEach((win) => {
        win.webContents.send('auth-token', bearerToken)
      })
    }
  } catch (error) {
    console.error('Error handling auth callback:', error)
  }
}

/**
 * Setup auth IPC handlers
 */
export function setupAuthHandlers(): void {
  ipcMain.on('auth-sign-in', (event) => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender)
    openAuthWindow(parentWindow)
  })

  ipcMain.on('auth-sign-out', () => {
    // Clear cookies for our domain
    session.defaultSession.cookies.remove(API_BASE, 'better-auth.session_token').catch(() => {})
    // Notify renderers to clear their sessions
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('auth-signed-out')
    })
  })
}
