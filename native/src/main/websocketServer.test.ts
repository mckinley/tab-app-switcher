// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServer } from 'net'
import { networkInterfaces } from 'os'
import { WebSocket } from 'ws'
import { isAllowedOrigin, startWebSocketServer, stopWebSocketServer } from './websocketServer'

/** Connect and report what happened: 'open', the HTTP status of a refusal, or the error code */
function tryConnect(url: string, origin?: string): Promise<string | number> {
  return new Promise((resolve) => {
    const ws = new WebSocket(url, origin ? { origin } : {})
    ws.on('open', () => {
      ws.terminate()
      resolve('open')
    })
    ws.on('unexpected-response', (_request, response) => resolve(response.statusCode ?? 0))
    ws.on('error', (error: NodeJS.ErrnoException) => resolve(error.code ?? error.message))
  })
}

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const probe = createServer().listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as { port: number }
      probe.close(() => resolve(port))
    })
  })
}

function hasIpv6Loopback(): boolean {
  return Object.values(networkInterfaces()).some((addresses) =>
    addresses?.some((a) => a.family === 'IPv6' && a.internal)
  )
}

const EXTENSION = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop'

describe('isAllowedOrigin', () => {
  it.each([
    EXTENSION,
    'moz-extension://2f1c3a8e-1111-4c4c-9e9e-123456789abc',
    'safari-web-extension://2F1C3A8E-1111-4C4C-9E9E-123456789ABC'
  ])('allows the extension origin %s', (origin) => {
    expect(isAllowedOrigin(origin)).toBe(true)
  })

  it.each([
    undefined,
    '',
    'null',
    'https://evil.example',
    'http://localhost:4409',
    'chrome-extension://abc/path',
    'https://chrome-extension.evil.example'
  ])('refuses %j', (origin) => {
    expect(isAllowedOrigin(origin)).toBe(false)
  })
})

describe('WebSocket server', () => {
  let port: number

  beforeEach(async () => {
    port = await freePort()
    startWebSocketServer({ port })
    // Wait for it to listen
    for (let i = 0; i < 50; i++) {
      if ((await tryConnect(`ws://127.0.0.1:${port}`, EXTENSION)) === 'open') return
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  })

  afterEach(() => {
    stopWebSocketServer()
  })

  it('accepts the extension on both loopback addresses', async () => {
    expect(await tryConnect(`ws://127.0.0.1:${port}`, EXTENSION)).toBe('open')
    if (hasIpv6Loopback()) expect(await tryConnect(`ws://[::1]:${port}`, EXTENSION)).toBe('open')
  })

  it('refuses web pages and clients with no origin', async () => {
    expect(await tryConnect(`ws://127.0.0.1:${port}`, 'https://evil.example')).toBe(403)
    expect(await tryConnect(`ws://127.0.0.1:${port}`)).toBe(403)
  })

  it("isn't reachable from the network", async () => {
    const lanAddress = Object.values(networkInterfaces())
      .flat()
      .find((a) => a && a.family === 'IPv4' && !a.internal)?.address
    if (!lanAddress) return
    expect(await tryConnect(`ws://${lanAddress}:${port}`, EXTENSION)).toBe('ECONNREFUSED')
  })
})
