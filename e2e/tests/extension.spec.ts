import { test, expect } from "@playwright/test"
import { startPageServer, type PageServer } from "../helpers/pages"
import { launchBrowser, type TestBrowser } from "../helpers/browser"
import { chord, hasXdotool } from "../helpers/keys"
import { assertBuilt } from "../helpers/paths"

let pages: PageServer
let browser: TestBrowser

test.beforeAll(async () => {
  assertBuilt()
  pages = await startPageServer()
})
test.afterAll(async () => pages?.close())
test.beforeEach(async () => {
  browser = await launchBrowser(pages, ["P1"])
})
test.afterEach(async () => browser?.close())

test("lists tabs most recently used first", async () => {
  const [profile] = browser.profiles
  await profile.openTabs(["Inbox", "Calendar", "Docs"])
  await profile.activate("Inbox")

  await expect.poll(async () => (await profile.switcherTitles()).slice(0, 3)).toEqual(["Inbox", "Docs", "Calendar"])
})

test("clicking a tab in the popup switches to it", async () => {
  const [profile] = browser.profiles
  await profile.openTabs(["Inbox", "Calendar", "Docs"])

  const popup = await browser.context.newPage()
  await popup.goto(`chrome-extension://${browser.extensionId}/popup.html`)
  await popup.locator("[data-tab-id]", { hasText: "Calendar" }).click()

  await expect.poll(() => profile.activeTitle()).toBe("Calendar")
})

test("a recently closed tab reopens from the popup", async () => {
  const [profile] = browser.profiles
  await profile.openTabs(["Inbox", "Old report"])
  await profile.closeTab("Old report")

  const popup = await browser.context.newPage()
  await popup.goto(`chrome-extension://${browser.extensionId}/popup.html`)
  const row = popup.locator("[data-tab-id^='session:']", { hasText: "Old report" })
  await expect(row).toBeVisible()
  // Not an open tab, so it has no close button
  await expect(row.getByRole("button", { name: /close/i })).toHaveCount(0)
  await row.click()

  await expect.poll(() => profile.openTitles()).toContain("Old report")
  await expect.poll(() => profile.activeTitle()).toBe("Old report")
})

test("the popup suggests pinning the extension until it's pinned", async () => {
  // Chrome animates an unpinned extension's icon out of the Extensions menu before it opens
  // the popup, which makes every Alt+Tab about 0.3 seconds slower
  const [profile] = browser.profiles
  const popup = await browser.context.newPage()
  await popup.goto(`chrome-extension://${browser.extensionId}/popup.html`)
  await expect(popup.getByText("Pin this extension")).toBeVisible()

  await profile.setPinned(true)
  await popup.reload()
  await expect(popup.locator("[data-tab-id]").first()).toBeVisible()
  await expect(popup.getByText("Pin this extension")).toHaveCount(0)
})

test('the "Last accessed" order follows tab switches', async () => {
  const [profile] = browser.profiles
  await profile.openTabs(["Inbox", "Calendar", "Docs"])
  await profile.worker.evaluate(() => chrome.storage.local.set({ sortOrder: "accessed" }))

  await profile.activate("Inbox")
  await expect.poll(async () => (await profile.switcherTitles()).slice(0, 3)).toEqual(["Inbox", "Docs", "Calendar"])
  await profile.activate("Calendar")
  await expect.poll(async () => (await profile.switcherTitles()).slice(0, 3)).toEqual(["Calendar", "Inbox", "Docs"])
})

test.describe("real key presses", () => {
  test.skip(!hasXdotool(), "needs an X display and xdotool (run with e2e/run.sh)")

  // Both shortcut scopes a person can pick on chrome://extensions/shortcuts
  for (const scope of ["CHROME", "GLOBAL"] as const) {
    test.describe(`${scope === "CHROME" ? '"In Chrome"' : '"Global"'} shortcut scope`, () => {
      test.beforeEach(async () => {
        if (scope === "GLOBAL") await browser.profiles[0].setShortcutScope("GLOBAL")
      })

      test("Alt+Tab, then releasing Alt, goes back to the previous tab", async () => {
        const [profile] = browser.profiles
        await profile.openTabs(["Inbox", "Calendar", "Docs"])
        await profile.activate("Docs")

        await chord("alt", ["Tab"], 600)

        await expect.poll(() => profile.activeTitle()).toBe("Calendar")
      })

      test("Alt+Tab+Tab goes back two tabs", async () => {
        const [profile] = browser.profiles
        await profile.openTabs(["Inbox", "Calendar", "Docs"])
        await profile.activate("Docs")

        await chord("alt", ["Tab", "Tab"], 600)

        await expect.poll(() => profile.activeTitle()).toBe("Inbox")
      })

      test("Alt+Tab+Tab+Tab goes back three tabs", async () => {
        const [profile] = browser.profiles
        await profile.openTabs(["Inbox", "Calendar", "Docs"])
        await profile.activate("Docs")
        const titles = await profile.switcherTitles()

        await chord("alt", ["Tab", "Tab", "Tab"], 600)

        await expect.poll(() => profile.activeTitle()).toBe(titles[3 % titles.length])
      })

      test("Shift+Tab, with Alt still held, moves the selection back", async () => {
        const [profile] = browser.profiles
        await profile.openTabs(["Inbox", "Calendar", "Docs"])
        await profile.activate("Docs")

        await chord("alt", ["Tab", "Tab", "shift+Tab"], 600)

        await expect.poll(() => profile.activeTitle()).toBe("Calendar")
      })
    })
  }
})
