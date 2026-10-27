/**
 * Sign-in for the Mac app. Google sign-in runs in the person's own browser (Google doesn't
 * allow it in embedded windows), which comes back to this app's local server with a one-time
 * code that the app trades for a bearer token. See tas/utils/appAuth.ts and
 * site/src/lib/appAuth.server.ts.
 *
 * The token is kept encrypted with the system keychain (safeStorage), or only in memory where
 * that isn't available.
 */
import { app, BrowserWindow, ipcMain, safeStorage, shell } from 'electron'
import Store from 'electron-store'
import type { IncomingMessage, ServerResponse } from 'http'
import {
  appSignInUrl,
  createPkce,
  NATIVE_SIGN_IN_REDIRECT,
  PRODUCTION_API_BASE,
  readSignInCode,
  redeemSignInCode
} from '@tas/utils/appAuth'

const API_BASE = PRODUCTION_API_BASE
const CALLBACK_PATH = new URL(NATIVE_SIGN_IN_REDIRECT).pathname
const SIGN_IN_TIMEOUT_MS = 10 * 60 * 1000

const authStore = new Store<{ token?: string }>({ name: 'auth' })
let memoryToken: string | null = null

interface PendingSignIn {
  verifier: string
  window: BrowserWindow | null
  resolve: () => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}
let pending: PendingSignIn | null = null

function getToken(): string | null {
  if (memoryToken) return memoryToken
  const saved = authStore.get('token')
  if (!saved || !safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(Buffer.from(saved, 'base64'))
  } catch {
    return null
  }
}

function setToken(token: string | null): void {
  memoryToken = null
  authStore.delete('token')
  if (token && safeStorage.isEncryptionAvailable()) {
    authStore.set('token', safeStorage.encryptString(token).toString('base64'))
  } else if (token) {
    memoryToken = token
  }
  BrowserWindow.getAllWindows().forEach((win) => win.webContents.send('auth-changed'))
}

function endPending(): PendingSignIn | null {
  const ended = pending
  if (ended) clearTimeout(ended.timer)
  pending = null
  return ended
}

/** Open sign-in in the browser. Resolves once the browser comes back signed in. */
async function signIn(window: BrowserWindow | null): Promise<void> {
  endPending()?.reject(new Error('Sign-in started again'))
  const { verifier, challenge } = await createPkce()
  const finished = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      endPending()
      reject(new Error("Sign-in didn't finish. Try again."))
    }, SIGN_IN_TIMEOUT_MS)
    pending = { verifier, window, resolve, reject, timer }
  })
  await shell.openExternal(appSignInUrl(API_BASE, NATIVE_SIGN_IN_REDIRECT, challenge))
  return finished
}

/** The browser came back to the callback URL */
async function finishSignIn(callbackUrl: string): Promise<void> {
  const current = endPending()
  if (!current) throw new Error('No sign-in is in progress')
  try {
    // Throws when sign-in was cancelled or failed in the browser
    setToken(await redeemSignInCode(API_BASE, readSignInCode(callbackUrl), current.verifier))
  } catch (error) {
    current.reject(error as Error)
    throw error
  }
  current.resolve()
  if (current.window && !current.window.isDestroyed()) current.window.show()
  app.focus({ steal: true })
}

function respond(response: ServerResponse, status: number, message: string): void {
  response
    .writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    .end(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Tab Application Switcher</title>` +
        `<style>body{font:16px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px;box-sizing:border-box}</style>` +
        `</head><body><p>${message}</p></body></html>`
    )
}

/**
 * Requests to the extension server's port: handles GET /auth/callback, where the browser comes
 * back after sign-in. Returns false for anything else.
 */
export function handleAuthRequest(request: IncomingMessage, response: ServerResponse): boolean {
  const url = new URL(request.url ?? '/', NATIVE_SIGN_IN_REDIRECT)
  if (request.method !== 'GET' || url.pathname !== CALLBACK_PATH) return false

  finishSignIn(url.href).then(
    () =>
      respond(
        response,
        200,
        "You're signed in to Tab Application Switcher. You can close this tab."
      ),
    () =>
      respond(
        response,
        400,
        "Sign-in didn't finish. Close this tab and try again from Tab Application Switcher."
      )
  )
  return true
}

/**
 * Setup auth IPC handlers
 */
export function setupAuthHandlers(): void {
  ipcMain.handle('auth:get-token', () => getToken())

  // Errors come back as values: an invoke's rejection wraps the message in IPC details
  ipcMain.handle('auth:sign-in', (event) =>
    signIn(BrowserWindow.fromWebContents(event.sender)).then(
      () => ({ error: null }),
      (error: Error) => ({ error: error.message })
    )
  )

  ipcMain.handle('auth:clear-token', () => setToken(null))
}
