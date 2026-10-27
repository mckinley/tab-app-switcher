/**
 * Tab actions shared by the background script (popup and native app requests) and the Tab
 * Management page, which can call the browser APIs directly.
 */
import { browser } from "wxt/browser"

/** Prefix of the ids the switcher gives Recently Closed and Other Devices rows (see tas/sorting) */
const SESSION_ID_PREFIX = "session:"

/** Switch to a tab and bring its window to the front */
export async function activateTab(tabId: number): Promise<void> {
  const tab = await browser.tabs.update(tabId, { active: true })
  if (tab?.windowId !== undefined) {
    await browser.windows.update(tab.windowId, { focused: true })
  }
}

/** Reopen a recently closed tab or window, or open a tab from another device */
export async function restoreSession(sessionId: string): Promise<void> {
  const restored = await browser.sessions.restore(sessionId)
  const windowId = restored?.tab?.windowId ?? restored?.window?.id
  if (windowId !== undefined) {
    await browser.windows.update(windowId, { focused: true })
  }
}

/** Open a row from the switcher: an open tab, or a Recently Closed or Other Devices entry */
export async function openSwitcherTab(id: string): Promise<void> {
  if (id.startsWith(SESSION_ID_PREFIX)) {
    await restoreSession(id.slice(SESSION_ID_PREFIX.length))
  } else {
    await activateTab(Number(id))
  }
}

/** Move a tab to `index` in its window, or in `windowId` */
export async function moveTab(tabId: number, index: number, windowId?: number): Promise<void> {
  const tab = await browser.tabs.get(tabId)
  await browser.tabs.move(tabId, { windowId: windowId ?? tab.windowId, index })
}

/** Open the URLs in a new window, in order, with the first one showing */
export async function createWindowWithUrls(urls: string[]): Promise<void> {
  if (urls.length === 0) return
  const newWindow = await browser.windows.create({ url: urls[0], focused: true })
  if (newWindow?.id === undefined) return
  for (const url of urls.slice(1)) {
    await browser.tabs.create({ windowId: newWindow.id, url, active: false })
  }
}
