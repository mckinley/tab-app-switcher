import path from "node:path"
import { _electron, type ElectronApplication, type Page } from "@playwright/test"
import { ELECTRON_BIN, NATIVE_MAIN, REPO_ROOT, tempDir } from "./paths"
import { sleep } from "./keys"

export interface NativeTab {
  id: string
  title: string
  section?: string
  browser?: string
  windowId?: number
  index?: number
}

export interface NativeApp {
  app: ElectronApplication
  /** Browser sessions connected to the app's WebSocket server. */
  sessions(): Promise<{ browserType: string; instanceId: string; tabCount: number }[]>
  /** The tab list the overlay shows, in order. */
  displayTabs(): Promise<NativeTab[]>
  /** Change a setting the way the settings window does (e.g. "keyboard"). */
  setAppOption(key: string, value: unknown): Promise<void>
  /** Whether the overlay window is showing. */
  overlayVisible(): Promise<boolean>
  /** Wait until `count` browser sessions are connected and have sent their tabs. */
  waitForSessions(count: number): Promise<void>
  /** The switcher overlay window, if it has been created. */
  overlay(): Page | undefined
  /** Wait for the overlay to be showing, and return it. */
  waitForOverlay(): Promise<Page>
  /** Titles shown in the overlay, top to bottom. */
  overlayTitles(): Promise<string[]>
  /** The title of the highlighted row in the overlay. */
  overlaySelectedTitle(): Promise<string | null>
  close(): Promise<void>
}

type E2EGlobal = typeof globalThis & {
  __tasE2E: { sessions(): unknown; displayTabs(): unknown; setAppOption(key: string, value: unknown): unknown }
}

/** Launch the built native app with a fresh settings folder. */
export async function launchNative(): Promise<NativeApp> {
  const home = tempDir("native-home")
  const app = await _electron.launch({
    executablePath: ELECTRON_BIN,
    args: [NATIVE_MAIN, "--no-sandbox"],
    cwd: path.join(REPO_ROOT, "native"),
    env: {
      ...process.env,
      HOME: home,
      XDG_CONFIG_HOME: path.join(home, ".config"),
      TAS_E2E: "1",
    } as Record<string, string>,
  })

  // The app's console output, included in errors to make failures readable
  const logs: string[] = []
  const collect = (chunk: Buffer) => logs.push(...String(chunk).split("\n").filter(Boolean))
  app.process().stdout?.on("data", collect)
  app.process().stderr?.on("data", collect)
  const recentLogs = () => logs.slice(-15).join("\n  ")

  const native: NativeApp = {
    app,
    sessions: () => app.evaluate(() => (globalThis as E2EGlobal).__tasE2E.sessions()) as never,
    displayTabs: () => app.evaluate(() => (globalThis as E2EGlobal).__tasE2E.displayTabs()) as never,
    async setAppOption(key, value) {
      await app.evaluate((_electron, [k, v]) => (globalThis as E2EGlobal).__tasE2E.setAppOption(k, v), [
        key,
        value,
      ] as const)
    },
    overlayVisible: () =>
      app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some((w) => w.webContents.getURL().includes("tas.html") && w.isVisible()),
      ),

    async waitForSessions(count) {
      for (let i = 0; i < 100; i++) {
        const sessions = await native.sessions().catch(() => [])
        if (sessions.length >= count && sessions.every((s) => s.tabCount > 0)) return
        await sleep(200)
      }
      throw new Error(`Native app never saw ${count} connected browser session(s). Its log:\n  ${recentLogs()}`)
    },

    overlay: () => app.windows().find((w) => w.url().includes("tas.html")),

    async waitForOverlay() {
      for (let i = 0; i < 50; i++) {
        const page = native.overlay()
        if (page) {
          if ((await native.overlayVisible()) && (await page.locator("[data-tab-id]").count()) > 0) return page
        }
        await sleep(100)
      }
      const state = await app.evaluate(({ BrowserWindow, globalShortcut }) => ({
        altTabRegistered: globalShortcut.isRegistered("Alt+Tab"),
        windows: BrowserWindow.getAllWindows().map(
          (w) => `${w.webContents.getURL().split("/").pop()} visible=${w.isVisible()}`,
        ),
      }))
      throw new Error(
        `The switcher overlay did not open (${JSON.stringify(state)}). Native app log:\n  ${recentLogs()}`,
      )
    },

    async overlayTitles() {
      const page = await native.waitForOverlay()
      return page.locator("[data-tab-id] [data-tab-title]").allInnerTexts()
    },

    async overlaySelectedTitle() {
      const page = native.overlay()
      if (!page) return null
      const selected = page.locator("[data-tab-id][data-selected='true'] [data-tab-title]")
      return (await selected.count()) ? selected.first().innerText() : null
    },

    async close() {
      // Wait for the process to be gone, so the next test's app can take the port and Alt+Tab
      const proc = app.process()
      const exited = new Promise<void>((resolve) => {
        if (proc.exitCode !== null) resolve()
        else proc.once("exit", () => resolve())
      })
      await app.close().catch(() => {})
      const timer = setTimeout(() => proc.kill("SIGKILL"), 5000)
      await exited
      clearTimeout(timer)
    },
  }
  return native
}
