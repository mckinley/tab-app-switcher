// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'crypto'
import http from 'http'
import { createServer } from 'net'
import { NATIVE_SIGN_IN_REDIRECT } from '@tas/utils/appAuth'

const mock = vi.hoisted(() => ({
  handlers: {} as Record<string, (event?: unknown) => Promise<unknown> | unknown>,
  stored: new Map<string, unknown>(),
  keychain: true,
  send: (() => {}) as (channel: string) => void,
  opened: [] as string[]
}))

vi.mock('electron', () => {
  const win = {
    webContents: { send: (channel: string) => mock.send(channel) },
    isDestroyed: () => false,
    show: () => {}
  }
  return {
    app: { focus: () => {} },
    BrowserWindow: { getAllWindows: () => [win], fromWebContents: () => win },
    ipcMain: { handle: (channel: string, handler: never) => (mock.handlers[channel] = handler) },
    safeStorage: {
      isEncryptionAvailable: () => mock.keychain,
      encryptString: (text: string) => Buffer.from(`encrypted:${text}`),
      decryptString: (data: Buffer) => data.toString().replace('encrypted:', '')
    },
    shell: { openExternal: async (url: string) => void mock.opened.push(url) }
  }
})

vi.mock('electron-store', () => ({
  default: class {
    get = (key: string): unknown => mock.stored.get(key)
    set = (key: string, value: unknown): unknown => mock.stored.set(key, value)
    delete = (key: string): boolean => mock.stored.delete(key)
  }
}))

import { handleAuthRequest, setupAuthHandlers } from './auth'
import { startWebSocketServer, stopWebSocketServer } from './websocketServer'

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const probe = createServer().listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as { port: number }
      probe.close(() => resolve(port))
    })
  })
}

/** What the browser gets back from the app's local server */
function browse(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (response) => {
        let body = ''
        response.on('data', (chunk) => (body += chunk))
        response.on('end', () => resolve({ status: response.statusCode ?? 0, body }))
      })
      .on('error', reject)
  })
}

describe('Mac app sign-in', () => {
  let port: number
  let challenges: Map<string, string>
  const event = { sender: {} }

  beforeAll(async () => {
    setupAuthHandlers()
    port = await freePort()
    startWebSocketServer({ port, onHttpRequest: handleAuthRequest })
    // The server's token endpoint: a code redeems only with the verifier whose hash started the sign-in
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        expect(url).toBe('https://tabappswitcher.com/api/app-auth/token')
        const { code, verifier } = JSON.parse(String(init.body))
        const ok =
          challenges.get(code) === createHash('sha256').update(verifier).digest('base64url')
        return new Response(JSON.stringify({ token: `token-for-${code}` }), {
          status: ok ? 200 : 400
        })
      })
    )
  })

  afterAll(() => {
    stopWebSocketServer()
    vi.unstubAllGlobals()
  })

  beforeEach(async () => {
    await mock.handlers['auth:clear-token']()
    mock.keychain = true
    mock.send = vi.fn()
    challenges = new Map()
    mock.opened = []
  })

  /** Start signing in, and have the browser sign in and come back with `code` (or `?error=`) */
  async function signInWithBrowser(
    query: (code: string) => string,
    code = 'c1'
  ): Promise<{ page: { status: number; body: string }; result: { error: string | null } }> {
    const signingIn = mock.handlers['auth:sign-in'](event) as Promise<{ error: string | null }>
    await vi.waitFor(() => expect(mock.opened).toHaveLength(1))

    const start = new URL(mock.opened[0])
    expect(start.origin + start.pathname).toBe('https://tabappswitcher.com/api/app-auth/start')
    expect(start.searchParams.get('redirect')).toBe(NATIVE_SIGN_IN_REDIRECT)
    challenges.set(code, start.searchParams.get('challenge')!)

    const page = await browse(`http://127.0.0.1:${port}/auth/callback?${query(code)}`)
    return { page, result: await signingIn }
  }

  it('signs in in the browser, which comes back to the app, and keeps the token in the keychain', async () => {
    const { page, result } = await signInWithBrowser((code) => `code=${code}`)

    expect(result).toEqual({ error: null })
    expect(page.status).toBe(200)
    expect(page.body).toContain("You're signed in")
    expect(await mock.handlers['auth:get-token']()).toBe('token-for-c1')
    expect(mock.stored.get('token')).toBe(Buffer.from('encrypted:token-for-c1').toString('base64'))
    expect(mock.send).toHaveBeenCalledWith('auth-changed')

    await mock.handlers['auth:clear-token']()
    expect(await mock.handlers['auth:get-token']()).toBeNull()
    expect(mock.stored.has('token')).toBe(false)
  })

  it('reports a sign-in cancelled in the browser', async () => {
    const { page, result } = await signInWithBrowser(() => 'error=access_denied')
    expect(result).toEqual({ error: 'Sign-in was cancelled' })
    expect(page.status).toBe(400)
    expect(await mock.handlers['auth:get-token']()).toBeNull()
  })

  it("won't take a code meant for another sign-in", async () => {
    const { result } = await signInWithBrowser(() => 'code=someone-elses')
    expect(result.error).toMatch(/Sign-in failed/)
    expect(await mock.handlers['auth:get-token']()).toBeNull()

    // Nor any code when the app didn't start a sign-in
    expect((await browse(`http://127.0.0.1:${port}/auth/callback?code=c1`)).status).toBe(400)
  })

  it('keeps the token only in memory without a keychain', async () => {
    mock.keychain = false
    await signInWithBrowser((code) => `code=${code}`)
    expect(await mock.handlers['auth:get-token']()).toBe('token-for-c1')
    expect(mock.stored.has('token')).toBe(false)
  })

  it('leaves other requests to the server', async () => {
    expect((await browse(`http://127.0.0.1:${port}/`)).status).toBe(426)
    expect((await browse(`http://127.0.0.1:${port}/auth/other`)).status).toBe(426)
  })
})
