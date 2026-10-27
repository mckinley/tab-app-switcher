import WebSocket from "ws"

/**
 * A bare Chrome DevTools Protocol client. Playwright doesn't expose an extension's action
 * popup as a Page, so tests reach it through the browser's target list instead.
 */
export class Cdp {
  private nextId = 0
  private pending = new Map<number, (msg: { result?: unknown; error?: { message: string } }) => void>()

  private constructor(private ws: WebSocket) {
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw))
      const resolve = msg.id !== undefined ? this.pending.get(msg.id) : undefined
      if (resolve) {
        this.pending.delete(msg.id)
        resolve(msg)
      }
    })
  }

  static async connect(port: number): Promise<Cdp> {
    const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
    const ws = new WebSocket(webSocketDebuggerUrl)
    await new Promise((resolve, reject) => ws.once("open", resolve).once("error", reject))
    return new Cdp(ws)
  }

  async send<T = unknown>(method: string, params: object = {}, sessionId?: string): Promise<T> {
    const id = ++this.nextId
    const reply = new Promise<{ result?: unknown; error?: { message: string } }>((resolve) =>
      this.pending.set(id, resolve),
    )
    this.ws.send(JSON.stringify({ id, method, params, sessionId }))
    const msg = await reply
    if (msg.error) throw new Error(`${method}: ${msg.error.message}`)
    return msg.result as T
  }

  async targets(): Promise<{ targetId: string; type: string; url: string; browserContextId?: string }[]> {
    return (await this.send<{ targetInfos: never[] }>("Target.getTargets")).targetInfos
  }

  /** Attach to a target and return a function that evaluates an expression inside it. */
  async attach(targetId: string): Promise<<T>(expression: string) => Promise<T>> {
    const { sessionId } = await this.send<{ sessionId: string }>("Target.attachToTarget", { targetId, flatten: true })
    return async <T>(expression: string) => {
      const res = await this.send<{ result: { value: T }; exceptionDetails?: { text: string } }>(
        "Runtime.evaluate",
        { expression, awaitPromise: true, returnByValue: true },
        sessionId,
      )
      if (res.exceptionDetails) throw new Error(res.exceptionDetails.text)
      return res.result.value
    }
  }

  close(): void {
    this.ws.close()
  }
}
