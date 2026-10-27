import { test, expect } from "@playwright/test"
import { startPageServer, type PageServer } from "../helpers/pages"
import { launchBrowser, type TestBrowser } from "../helpers/browser"
import { Cdp } from "../helpers/cdp"
import { chord, hasXdotool, sleep, xdotool } from "../helpers/keys"
import { assertBuilt } from "../helpers/paths"

// Two Chrome profiles open at once, each with the extension, in one browser process.

let pages: PageServer
let browser: TestBrowser

test.skip(!hasXdotool(), "needs an X display and xdotool (run with e2e/run.sh)")

test.beforeAll(async () => {
  assertBuilt()
  pages = await startPageServer()
})
test.afterAll(async () => pages?.close())
test.beforeEach(async () => {
  browser = await launchBrowser(pages, ["P1", "P2"])
  const [p1, p2] = browser.profiles
  await p1.openTabs(["P1-mail", "P1-docs"])
  await p2.openTabs(["P2-mail", "P2-docs"])
})
test.afterEach(async () => browser?.close())

test('each profile gets its own Alt+Tab with the default "In Chrome" scope', async () => {
  const [p1, p2] = browser.profiles

  await p2.activate("P2-docs")
  await chord("alt", ["Tab"], 600)
  await expect.poll(() => p2.activeTitle()).toBe("P2-mail")
  expect(await p1.activeTitle()).toBe("P1-docs")

  await p1.activate("P1-docs")
  const twoBack = (await p1.switcherTitles())[2]
  await chord("alt", ["Tab", "Tab"], 600)
  await expect.poll(() => p1.activeTitle()).toBe(twoBack)
  expect(await p2.activeTitle()).toBe("P2-mail")
})

test('with "Global" scope the popup explains why it shows another profile\'s tabs', async () => {
  const [p1, p2] = browser.profiles
  // Chrome gives a global shortcut to one profile only (here the first), whichever window has focus
  await p1.setShortcutScope("GLOBAL")
  await p2.setShortcutScope("GLOBAL")
  await sleep(500)

  await p2.activate("P2-docs")
  const cdp = await Cdp.connect(browser.debugPort)
  xdotool("keydown", "alt")
  try {
    xdotool("key", "Tab")
    await sleep(1000)
    const popups = (await cdp.targets()).filter((t) => t.url.includes("/popup.html"))
    expect(popups).toHaveLength(1)
    const inPopup = await cdp.attach(popups[0].targetId)
    const text = await inPopup<string>("document.body.innerText")
    // It's profile 1's popup, even though profile 2 had focus...
    expect(text).toContain("P1-docs")
    expect(text).not.toContain("P2-docs")
    // ...so it says why
    expect(text).toContain('This shortcut is set to "Global"')
  } finally {
    xdotool("keyup", "alt")
    cdp.close()
  }
})
