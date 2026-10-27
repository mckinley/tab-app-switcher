import http from "node:http"
import type { AddressInfo } from "node:net"

/**
 * Serves tiny pages whose title is the path, so `/Inbox` is a tab titled "Inbox".
 * Distinct titles make each browser window easy to find with xdotool.
 */
export interface PageServer {
  url(name: string): string
  close(): Promise<void>
}

export async function startPageServer(): Promise<PageServer> {
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent((req.url ?? "/").slice(1).split("?")[0]) || "home"
    res.setHeader("content-type", "text/html; charset=utf-8")
    res.end(`<!doctype html><title>${name.replace(/[<&]/g, "")}</title><h1>${name.replace(/[<&]/g, "")}</h1>`)
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const { port } = server.address() as AddressInfo
  return {
    url: (name) => `http://127.0.0.1:${port}/${encodeURIComponent(name)}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  }
}
