import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

/** The Chrome MV3 build that `npm run build --workspace=extension` writes. */
export const EXTENSION_DIR = path.join(REPO_ROOT, "extension/.output/chrome-mv3")

/** The native app's built main process (`electron-vite build`). */
export const NATIVE_MAIN = path.join(REPO_ROOT, "native/out/main/index.js")
export const ELECTRON_BIN = path.join(REPO_ROOT, "node_modules/electron/dist/electron")

/** The port the extension dials and the native app listens on. */
export const NATIVE_PORT = 48125

export function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `tas-e2e-${prefix}-`))
}

export function assertBuilt(): void {
  const missing = [
    [path.join(EXTENSION_DIR, "manifest.json"), "npm run build --workspace=extension"],
    [NATIVE_MAIN, "npm run build --workspace=native"],
    [ELECTRON_BIN, "node node_modules/electron/install.js"],
  ].filter(([file]) => !fs.existsSync(file))
  if (missing.length) {
    throw new Error(`Missing build output. Run first:\n${missing.map(([f, cmd]) => `  ${cmd}   (${f})`).join("\n")}`)
  }
}
