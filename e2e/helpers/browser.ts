import { spawn, type ChildProcess } from "node:child_process"
import net from "node:net"
import { chromium, type Browser, type BrowserContext, type Worker } from "@playwright/test"
import { EXTENSION_DIR, tempDir } from "./paths"
import { focusWindow, sleep } from "./keys"
import type { PageServer } from "./pages"

/**
 * One real Chromium process with one or more profiles, each running the built extension,
 * like a person with several Chrome profiles open. Playwright's own launcher only supports a
 * single profile, so we start Chromium ourselves and attach over CDP.
 */
export interface Profile {
  /** Short name, also the title of the profile's first tab ("<name>-home"). */
  name: string
  worker: Worker
  /** Open tabs (one per title) in this profile's window, in order. */
  openTabs(titles: string[]): Promise<void>
  /** Make the tab with this title active and give its window real keyboard focus. */
  activate(title: string): Promise<void>
  /** Close the tab with this title. */
  closeTab(title: string): Promise<void>
  /** Titles of every open tab in this profile. */
  openTitles(): Promise<string[]>
  /** Give this profile's window real keyboard focus without changing its active tab. */
  focus(): Promise<void>
  /** Title of the active tab in this profile's last-focused window. */
  activeTitle(): Promise<string>
  /** The tab list the extension's switcher would show, in order. */
  switcherTitles(): Promise<string[]>
  /** Set the shortcut scope (what chrome://extensions/shortcuts sets). */
  setShortcutScope(scope: "CHROME" | "GLOBAL"): Promise<void>
  /** Pin or unpin the extension's icon on the toolbar (what the Extensions menu's pin does). */
  setPinned(pinned: boolean): Promise<void>
}

export interface TestBrowser {
  browser: Browser
  context: BrowserContext
  profiles: Profile[]
  extensionId: string
  /** The DevTools port, for raw CDP access (see Cdp). */
  debugPort: number
  close(): Promise<void>
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as net.AddressInfo
      srv.close(() => resolve(port))
    })
    srv.on("error", reject)
  })
}

async function waitFor<T>(
  what: string,
  fn: () => Promise<T | undefined | null | false>,
  timeoutMs = 20000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      const value = await fn()
      if (value) return value
    } catch (error) {
      lastError = error
    }
    await sleep(200)
  }
  throw new Error(`Timed out waiting for ${what}${lastError ? `: ${lastError}` : ""}`)
}

export async function launchBrowser(pages: PageServer, profileNames: string[] = ["P1"]): Promise<TestBrowser> {
  const userDataDir = tempDir("chromium")
  const port = await freePort()
  const common = [
    `--user-data-dir=${userDataDir}`,
    `--disable-extensions-except=${EXTENSION_DIR}`,
    `--load-extension=${EXTENSION_DIR}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--password-store=basic",
    "--disable-features=Translate,MediaRouter",
    "--window-size=1000,750",
    // Test machines (CI runners, containers) often can't run Chromium's sandbox
    "--no-sandbox",
  ]
  const exe = chromium.executablePath()
  const procs: ChildProcess[] = []
  const start = (args: string[]) => procs.push(spawn(exe, [...common, ...args], { stdio: "ignore" }))

  start([`--remote-debugging-port=${port}`, "--profile-directory=Default", pages.url(`${profileNames[0]}-home`)])
  await waitFor("Chromium's DevTools port", async () => (await fetch(`http://127.0.0.1:${port}/json/version`)).ok)
  // Later profiles open in the same browser process; the launcher hands off and exits.
  profileNames.slice(1).forEach((name, i) => {
    start([`--profile-directory=Profile ${i + 2}`, pages.url(`${name}-home`)])
  })

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
  // Over CDP, Playwright puts every profile's targets in one default context.
  const context = browser.contexts()[0]

  const isOurs = async (w: Worker) =>
    w.url().endsWith("/background.js") &&
    (await w.evaluate(() => chrome.runtime.getManifest().homepage_url === "https://tabappswitcher.com"))
  const workerFor = async (name: string): Promise<Worker> =>
    waitFor(`the extension's service worker in ${name}`, async () => {
      for (const w of context.serviceWorkers()) {
        if (!(await isOurs(w))) continue
        const home = pages.url(`${name}-home`)
        const has = await w.evaluate(async (url) => (await chrome.tabs.query({})).some((t) => t.url === url), home)
        if (has) return w
      }
      return undefined
    })

  const profiles: Profile[] = []
  for (const name of profileNames) {
    const worker = await workerFor(name)
    profiles.push(makeProfile(name, worker, context, pages))
  }
  const extensionId = new URL(profiles[0].worker.url()).host

  return {
    browser,
    context,
    profiles,
    extensionId,
    debugPort: port,
    async close() {
      await browser.close().catch(() => {})
      for (const p of procs) p.kill("SIGKILL")
    },
  }
}

function makeProfile(name: string, worker: Worker, context: BrowserContext, pages: PageServer): Profile {
  const extensionId = new URL(worker.url()).host

  // Runs `fn` in an extension page of this profile, the way the popup talks to the background
  // script. The page is opened in the background and closed again, so it never shows up in the
  // tab list. (Not popup.html: that page answers the shortcut's messages as if it were the popup.)
  async function inExtensionPage<T>(fn: () => Promise<T>): Promise<T> {
    const url = `chrome-extension://${extensionId}/options.html?e2e-helper=${Math.random()}`
    const tabId = await worker.evaluate((u) => chrome.tabs.create({ url: u, active: false }).then((t) => t.id!), url)
    try {
      const page = await waitFor(`an extension page in ${name}`, async () =>
        context.pages().find((p) => p.url() === url),
      )
      await page.waitForLoadState()
      return await page.evaluate(fn)
    } finally {
      await worker.evaluate((id) => chrome.tabs.remove(id), tabId)
    }
  }

  const profile: Profile = {
    name,
    worker,

    async openTabs(titles) {
      for (const title of titles) {
        await worker.evaluate(async (url) => {
          const [win] = await chrome.windows.getAll({ windowTypes: ["normal"] })
          await chrome.tabs.create({ url, windowId: win.id, active: true })
        }, pages.url(title))
        await waitFor(`tab "${title}" to load`, () =>
          worker.evaluate(
            async (t) => (await chrome.tabs.query({ title: t })).some((tab) => tab.status === "complete"),
            title,
          ),
        )
        // Give the tab tracker a moment so activation order is unambiguous
        await sleep(150)
      }
    },

    async activate(title) {
      await worker.evaluate(async (t) => {
        const [tab] = await chrome.tabs.query({ title: t })
        if (!tab?.id) throw new Error(`no tab titled ${t}`)
        await chrome.tabs.update(tab.id, { active: true })
        await chrome.windows.update(tab.windowId, { focused: true })
      }, title)
      await sleep(150)
      await focusWindow(title)
    },

    async closeTab(title) {
      await worker.evaluate(async (t) => {
        const [tab] = await chrome.tabs.query({ title: t })
        if (!tab?.id) throw new Error(`no tab titled ${t}`)
        await chrome.tabs.remove(tab.id)
      }, title)
      await sleep(300)
    },

    async openTitles() {
      return worker.evaluate(async () => (await chrome.tabs.query({})).map((t) => t.title ?? ""))
    },

    async focus() {
      await profile.activate(await profile.activeTitle())
    },

    async activeTitle() {
      return worker.evaluate(async () => {
        const win = await chrome.windows.getLastFocused({ populate: true, windowTypes: ["normal"] })
        return win.tabs?.find((t) => t.active)?.title ?? ""
      })
    },

    async switcherTitles() {
      return inExtensionPage(async () => {
        const res = await chrome.runtime.sendMessage({ type: "GET_TABS" })
        return (res.tabs as { section?: string; title: string; url: string }[])
          .filter((t) => (t.section ?? "tabs") === "tabs" && !t.url.includes("e2e-helper"))
          .map((t) => t.title)
      })
    },

    async setShortcutScope(scope) {
      await developerPrivate("updateExtensionCommand", { commandName: "tas_activate", scope })
    },

    async setPinned(pinned) {
      await developerPrivate("updateExtensionConfiguration", { pinnedToToolbar: pinned })
    },
  }

  /**
   * Calls chrome.developerPrivate (what the browser's extension settings pages use) for this
   * extension. It's only available to chrome://extensions itself, and the page has to be opened
   * from this profile, so it's opened through the extension.
   */
  async function developerPrivate(method: string, params: Record<string, unknown>): Promise<void> {
    const before = new Set(context.pages())
    await worker.evaluate(() =>
      chrome.tabs.create({ url: "chrome://extensions/shortcuts", active: false }).then(() => 1),
    )
    const page = await waitFor("chrome://extensions in " + name, async () =>
      context.pages().find((p) => !before.has(p) && p.url().startsWith("chrome://extensions")),
    )
    try {
      await page.waitForLoadState()
      await page.evaluate(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ([m, args]) => (chrome as any).developerPrivate[m](args),
        [method, { extensionId, ...params }] as const,
      )
    } finally {
      await page.close()
    }
  }

  return profile
}
