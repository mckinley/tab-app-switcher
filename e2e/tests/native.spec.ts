import { test, expect } from "@playwright/test"
import { startPageServer, type PageServer } from "../helpers/pages"
import { launchBrowser, type TestBrowser } from "../helpers/browser"
import { launchNative, type NativeApp } from "../helpers/native"
import { chord, focusedWindowTitle, hasXdotool, sleep, xdotool } from "../helpers/keys"
import { assertBuilt } from "../helpers/paths"

// The native app and the extension together: the app's own Alt+Tab, its overlay, and its
// connection to every browser profile.

let pages: PageServer
let native: NativeApp | undefined
let browser: TestBrowser | undefined

test.skip(process.platform !== "linux" || !hasXdotool(), "needs Linux with an X display and xdotool (e2e/run.sh)")

test.beforeAll(async () => {
  assertBuilt()
  pages = await startPageServer()
})
test.afterAll(async () => pages?.close())
test.afterEach(async () => {
  xdotool("keyup", "alt", "ctrl")
  await browser?.close()
  await native?.close()
  browser = native = undefined
})

/** Press Tab (while Alt is held) until the overlay highlights `title`. */
async function tabTo(app: NativeApp, title: string): Promise<void> {
  for (let i = 0; i < 12; i++) {
    if ((await app.overlaySelectedTitle()) === title) return
    xdotool("key", "Tab")
    await sleep(250)
  }
  throw new Error(`Couldn't select "${title}" in the overlay; it shows ${await app.overlayTitles()}`)
}

test("Alt+Tab opens the overlay with recent tabs first, and releasing Alt switches", async () => {
  native = await launchNative()
  browser = await launchBrowser(pages, ["P1"])
  const [profile] = browser.profiles
  await native.waitForSessions(1)
  await profile.openTabs(["Inbox", "Calendar", "Docs"])
  await profile.activate("Docs")

  xdotool("keydown", "alt")
  xdotool("key", "Tab")
  await native.waitForOverlay()
  expect((await native.overlayTitles()).slice(0, 3)).toEqual(["Docs", "Calendar", "Inbox"])
  expect(await native.overlaySelectedTitle()).toBe("Calendar")

  xdotool("key", "Down")
  await expect.poll(() => native!.overlaySelectedTitle()).toBe("Inbox")
  xdotool("keyup", "alt")

  await expect.poll(() => profile.activeTitle()).toBe("Inbox")
})

test("the overlay is ready before the first Alt+Tab, and every Alt+Tab starts on the previous tab", async () => {
  native = await launchNative()
  browser = await launchBrowser(pages, ["P1"])
  const [profile] = browser.profiles
  await native.waitForSessions(1)
  await profile.openTabs(["Inbox", "Calendar", "Docs"])
  await profile.activate("Docs")

  // Loaded at launch and kept up to date while hidden, so Alt+Tab only has to show it
  await expect.poll(async () => (await native!.overlay()?.locator("[data-tab-id]").count()) ?? 0).toBeGreaterThan(2)
  expect(await native.overlayVisible()).toBe(false)

  for (const [from, to] of [
    ["Docs", "Calendar"],
    ["Calendar", "Docs"],
    ["Docs", "Calendar"],
  ]) {
    expect(await profile.activeTitle()).toBe(from)
    xdotool("keydown", "alt")
    xdotool("key", "Tab")
    await native.waitForOverlay()
    expect(await native.overlaySelectedTitle()).toBe(to)
    xdotool("keyup", "alt")
    await expect.poll(() => profile.activeTitle()).toBe(to)
    await expect.poll(() => native!.overlayVisible()).toBe(false)
  }
})

test("lists every profile's tabs and switches to a tab in the other profile", async () => {
  native = await launchNative()
  browser = await launchBrowser(pages, ["P1", "P2"])
  const [p1, p2] = browser.profiles
  await native.waitForSessions(2)
  await p1.openTabs(["P1-mail", "P1-docs"])
  await p2.openTabs(["P2-mail", "P2-docs"])
  await p1.activate("P1-docs")

  xdotool("keydown", "alt")
  xdotool("key", "Tab")
  await native.waitForOverlay()
  const titles = await native.overlayTitles()
  expect(titles).toEqual(expect.arrayContaining(["P1-mail", "P1-docs", "P2-mail", "P2-docs"]))

  await tabTo(native, "P2-mail")
  xdotool("keyup", "alt")

  await expect.poll(() => p2.activeTitle()).toBe("P2-mail")
  await expect.poll(() => focusedWindowTitle()).toMatch(/^P2-mail/)
  expect(await p1.activeTitle()).toBe("P1-docs")

  // And back to the first profile
  xdotool("keydown", "alt")
  xdotool("key", "Tab")
  await native.waitForOverlay()
  await tabTo(native, "P1-mail")
  xdotool("keyup", "alt")

  await expect.poll(() => p1.activeTitle()).toBe("P1-mail")
  await expect.poll(() => focusedWindowTitle()).toMatch(/^P1-mail/)
  expect(await p2.activeTitle()).toBe("P2-mail")
})

test("a recently closed tab reopens from the overlay", async () => {
  native = await launchNative()
  browser = await launchBrowser(pages, ["P1"])
  const [profile] = browser.profiles
  await native.waitForSessions(1)
  await profile.openTabs(["Inbox", "Old report"])
  await profile.closeTab("Old report")
  await profile.activate("Inbox")
  await expect
    .poll(async () => (await native!.displayTabs()).find((t) => t.title === "Old report")?.section)
    .toBe("recentlyClosed")

  xdotool("keydown", "alt")
  xdotool("key", "Tab")
  await native.waitForOverlay()
  await tabTo(native, "Old report")
  xdotool("keyup", "alt")

  await expect.poll(() => profile.openTitles()).toContain("Old report")
  await expect.poll(() => profile.activeTitle()).toBe("Old report")
})

test("search: Alt+F, type, then Enter opens the highlighted match, not the row at that position", async () => {
  native = await launchNative()
  browser = await launchBrowser(pages, ["P1"])
  const [profile] = browser.profiles
  await native.waitForSessions(1)
  await profile.openTabs(["Inbox", "Team docs", "Calendar", "Design docs"])
  await profile.activate("Calendar")

  xdotool("keydown", "alt")
  xdotool("key", "Tab")
  await native.waitForOverlay()
  xdotool("key", "f")
  // Letting go of Alt to type doesn't pick a tab while the search box has focus
  xdotool("keyup", "alt")
  await sleep(400)
  expect(await native.overlayVisible()).toBe(true)
  expect(await profile.activeTitle()).toBe("Calendar")

  xdotool("type", "--delay", "50", "docs")
  await expect.poll(() => native!.overlayTitles()).toEqual(["Design docs", "Team docs"])
  expect(await native.overlaySelectedTitle()).toBe("Design docs")

  xdotool("key", "Down")
  await expect.poll(() => native!.overlaySelectedTitle()).toBe("Team docs")
  xdotool("key", "Return")

  await expect.poll(() => profile.activeTitle()).toBe("Team docs")
  await expect.poll(() => native!.overlayVisible()).toBe(false)

  // The next Alt+Tab starts without the search
  xdotool("keydown", "alt")
  xdotool("key", "Tab")
  const overlay = await native.waitForOverlay()
  expect(await overlay.locator("input").inputValue()).toBe("")
  expect(await native.overlayTitles()).toEqual(expect.arrayContaining(["Inbox", "Calendar", "Team docs"]))
  expect(await native.overlaySelectedTitle()).toBe("Calendar")
  xdotool("keyup", "alt")
  await expect.poll(() => profile.activeTitle()).toBe("Calendar")
})

test("uses the modifier key from settings", async () => {
  native = await launchNative()
  browser = await launchBrowser(pages, ["P1"])
  const [profile] = browser.profiles
  await native.waitForSessions(1)
  await profile.openTabs(["Inbox", "Calendar"])
  await profile.activate("Calendar")

  const keyboard = { modifier: "Ctrl", activateForward: "Tab", activateBackward: "`", search: "F", closeTab: "W" }
  await native.setAppOption("keyboard", keyboard)

  // Alt+Tab no longer opens the overlay
  await chord("alt", ["Tab"])
  await sleep(400)
  expect(await native.overlayVisible()).toBe(false)

  xdotool("keydown", "ctrl")
  xdotool("key", "Tab")
  await native.waitForOverlay()
  expect(await native.overlaySelectedTitle()).toBe("Inbox")
  xdotool("keyup", "ctrl")

  await expect.poll(() => profile.activeTitle()).toBe("Inbox")
})

test("keeps each tab's window and position as tabs move, for Tab Management", async () => {
  native = await launchNative()
  browser = await launchBrowser(pages, ["P1"])
  const [profile] = browser.profiles
  await native.waitForSessions(1)
  await profile.openTabs(["Inbox", "Calendar", "Docs"])
  const stripOrder = async () =>
    (await native!.displayTabs())
      .filter((t) => ["P1-home", "Inbox", "Calendar", "Docs"].includes(t.title))
      .sort((a, b) => a.index! - b.index!)
      .map((t) => t.title)
  await expect.poll(stripOrder).toEqual(["P1-home", "Inbox", "Calendar", "Docs"])

  await profile.worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ title: "Docs" })
    await chrome.tabs.move(tab.id!, { index: 0 })
  })

  await expect.poll(stripOrder).toEqual(["Docs", "P1-home", "Inbox", "Calendar"])
})

test('the "Last accessed" order follows tab switches', async () => {
  native = await launchNative()
  browser = await launchBrowser(pages, ["P1"])
  const [profile] = browser.profiles
  await native.waitForSessions(1)
  await profile.openTabs(["Inbox", "Calendar", "Docs"])
  await native.setAppOption("sortStrategy", "lastAccessed")

  await profile.activate("Inbox")

  await expect
    .poll(async () => (await native!.displayTabs()).slice(0, 3).map((t) => t.title))
    .toEqual(["Inbox", "Docs", "Calendar"])
})

test("Settings opens on the tab asked for: Connection on first run, Keys from the menu bar", async () => {
  native = await launchNative()
  const app = native.app

  // First run opens Settings at Setup, which is the Connection tab
  await expect.poll(() => app.windows().some((w) => w.url().includes("settings.html"))).toBe(true)
  const settings = app.windows().find((w) => w.url().includes("settings.html"))!
  const selectedTab = settings.getByRole("tab", { selected: true })
  await expect(selectedTab).toHaveText("Connection")

  // The menu bar's "Settings..." asks for Keys, in the URL when it opens the window...
  await settings.goto(settings.url().replace("tab=setup", "tab=keys"))
  await expect(selectedTab).toHaveText("Keys")

  // ...and by message when the window is already open
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes("settings.html"))
    win?.webContents.send("switch-tab", "setup")
  })
  await expect(selectedTab).toHaveText("Connection")
})
