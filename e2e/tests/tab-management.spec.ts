import { test, expect, type Page } from "@playwright/test"
import { startPageServer, type PageServer } from "../helpers/pages"
import { launchBrowser, type TestBrowser } from "../helpers/browser"
import { assertBuilt } from "../helpers/paths"

// The extension's Tab Management page (tabs.html): its "Current" list of open windows and tabs.

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

async function openTabManagement(): Promise<Page> {
  const page = await browser.context.newPage()
  await page.goto(`chrome-extension://${browser.extensionId}/tabs.html`)
  return page
}

/** Titles in the "Current" list, window by window, leaving out the extension's own pages */
async function currentTitles(page: Page): Promise<string[][]> {
  const windows = page.getByRole("complementary", { name: "Current tabs" }).locator("[data-window-id]")
  const titles: string[][] = []
  for (const win of await windows.all()) {
    const shown = await win.locator("[data-tab-id]").allInnerTexts()
    // The welcome page (opened on install) and this page
    const tabs = shown.map((t) => t.trim()).filter((t) => t && !t.includes("Tab Application Switcher"))
    if (tabs.length) titles.push(tabs)
  }
  return titles
}

test("Current lists only open tabs, so a recently closed tab isn't shown as a window", async () => {
  const [profile] = browser.profiles
  await profile.openTabs(["Inbox", "Old report"])
  await profile.closeTab("Old report")

  const page = await openTabManagement()

  await expect.poll(() => currentTitles(page)).toEqual([["P1-home", "Inbox"]])
})

test("Current follows the browser when tabs move, within a window and to a new one", async () => {
  const [profile] = browser.profiles
  await profile.openTabs(["Inbox", "Calendar", "Docs"])
  const page = await openTabManagement()
  await expect.poll(() => currentTitles(page)).toEqual([["P1-home", "Inbox", "Calendar", "Docs"]])

  // Drag "Docs" to the front of the tab strip
  await profile.worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ title: "Docs" })
    await chrome.tabs.move(tab.id!, { index: 0 })
  })
  await expect.poll(() => currentTitles(page)).toEqual([["Docs", "P1-home", "Inbox", "Calendar"]])

  // Drag "Inbox" out into a window of its own
  await profile.worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ title: "Inbox" })
    await chrome.windows.create({ tabId: tab.id })
  })
  await expect
    .poll(async () => (await currentTitles(page)).map((w) => w.join(",")).sort())
    .toEqual(["Docs,P1-home,Calendar", "Inbox"])
})
