import { BrowserWindow, ipcMain } from 'electron'

const SUPABASE_URL = 'https://vyxtwsiaqxoshrxyislb.supabase.co'
// For native apps, we use a custom scheme redirect that we can intercept
const REDIRECT_URL = 'https://tabappswitcher.com/auth/callback'

let authWindow: BrowserWindow | null = null

/**
 * Check if a URL is our OAuth callback with tokens
 */
function isAuthCallback(url: string): boolean {
  // Must start with our redirect URL and contain tokens in the hash
  if (!url.startsWith(REDIRECT_URL)) return false
  // Check for access_token in the URL (could be in hash or query)
  return url.includes('access_token=')
}

/**
 * Open OAuth window and handle the redirect to capture tokens
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

  // Construct the OAuth URL
  const params = new URLSearchParams({
    provider: 'google',
    redirect_to: REDIRECT_URL
  })
  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`

  // Listen for navigation to capture the redirect with tokens
  authWindow.webContents.on('will-redirect', (_event, url) => {
    if (isAuthCallback(url)) {
      handleAuthCallback(url)
      authWindow?.close()
    }
  })

  // Also check will-navigate for some OAuth flows
  authWindow.webContents.on('will-navigate', (_event, url) => {
    if (isAuthCallback(url)) {
      handleAuthCallback(url)
      authWindow?.close()
    }
  })

  authWindow.on('closed', () => {
    authWindow = null
  })

  authWindow.loadURL(authUrl)
}

/**
 * Extract tokens from callback URL and send to renderer
 */
function handleAuthCallback(url: string): void {
  try {
    const urlObj = new URL(url)
    // Tokens are in the hash fragment
    const hashParams = new URLSearchParams(urlObj.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')

    if (accessToken && refreshToken) {
      // Send tokens to all renderer windows (except the auth window)
      const windows = BrowserWindow.getAllWindows().filter((win) => win !== authWindow)
      windows.forEach((win) => {
        win.webContents.send('auth-tokens', { accessToken, refreshToken })
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
    // Just notify renderers to clear their sessions
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('auth-signed-out')
    })
  })
}
