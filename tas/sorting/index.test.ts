import { describe, it, expect } from "vitest"
import { transformTab, transformSessionTab, sortTabsWithSections } from "./index"
import type { BrowserTab, BrowserWindow, TabAugmentation, SessionTab, DeviceSession } from "../types/protocol"

// Helper to create a mock BrowserTab
function createTab(id: number, overrides: Partial<BrowserTab> = {}): BrowserTab {
  return {
    id,
    windowId: 1,
    index: 0,
    highlighted: false,
    active: false,
    pinned: false,
    incognito: false,
    url: `https://example.com/${id}`,
    title: `Tab ${id}`,
    ...overrides,
  }
}

describe("transformTab", () => {
  it("transforms BrowserTab to display Tab", () => {
    const browserTab = createTab(1, {
      title: "Test Tab",
      url: "https://test.com",
      favIconUrl: "https://test.com/favicon.ico",
      lastAccessed: 1000,
    })

    const tab = transformTab(browserTab)

    expect(tab.id).toBe("1")
    expect(tab.title).toBe("Test Tab")
    expect(tab.url).toBe("https://test.com")
    expect(tab.favicon).toBe("https://test.com/favicon.ico")
    expect(tab.section).toBe("tabs")
    expect(tab.lastAccessed).toBe(1000)
  })

  it("uses augmentation favicon over browser favicon", () => {
    const browserTab = createTab(1, { favIconUrl: "https://browser.com/favicon.ico" })
    const aug: TabAugmentation = { faviconDataUrl: "data:image/png;base64,..." }

    const tab = transformTab(browserTab, aug)
    expect(tab.favicon).toBe("data:image/png;base64,...")
  })

  it("includes timing fields from augmentation", () => {
    const browserTab = createTab(1, { lastAccessed: 1000 })
    const aug: TabAugmentation = { lastActivated: 2000, lastDeactivated: 1500 }

    const tab = transformTab(browserTab, aug)
    expect(tab.lastAccessed).toBe(1000)
    expect(tab.lastActivated).toBe(2000)
    expect(tab.lastDeactivated).toBe(1500)
  })

  it("assigns correct section", () => {
    const browserTab = createTab(1)
    expect(transformTab(browserTab, undefined, "tabs").section).toBe("tabs")
    expect(transformTab(browserTab, undefined, "apps").section).toBe("apps")
  })
})

describe("transformSessionTab", () => {
  it("transforms SessionTab for recently closed", () => {
    const sessionTab: SessionTab = {
      sessionId: "session123",
      title: "Closed Tab",
      url: "https://closed.com",
      favIconUrl: "https://closed.com/favicon.ico",
      lastModified: 1000, // seconds
    }

    const tab = transformSessionTab(sessionTab, "recentlyClosed")

    expect(tab.id).toBe("session:session123")
    expect(tab.title).toBe("Closed Tab")
    expect(tab.section).toBe("recentlyClosed")
    expect(tab.sessionId).toBe("session123")
    expect(tab.lastAccessed).toBe(1000000) // converted to ms
  })

  it("includes device name for other devices", () => {
    const sessionTab: SessionTab = {
      sessionId: "session123",
      title: "Phone Tab",
      url: "https://phone.com",
      lastModified: 1000,
    }

    const tab = transformSessionTab(sessionTab, "otherDevices", "iPhone")
    expect(tab.deviceName).toBe("iPhone")
    expect(tab.section).toBe("otherDevices")
  })
})

describe("sortTabsWithSections", () => {
  it("separates app tabs from regular tabs", () => {
    const sessionTabs = [
      createTab(1, { windowId: 1 }),
      createTab(2, { windowId: 2 }), // App window
      createTab(3, { windowId: 1 }),
    ]
    const sessionWindows: BrowserWindow[] = [
      { id: 1, focused: true, type: "normal", incognito: false, alwaysOnTop: false },
      { id: 2, focused: false, type: "app", incognito: false, alwaysOnTop: false },
    ]

    const sorted = sortTabsWithSections({
      sessionTabs,
      sessionWindows,
      augmentation: {},
    })

    // Regular tabs come first, then app tabs
    const regularTabs = sorted.filter((t) => t.section === "tabs")
    const appTabs = sorted.filter((t) => t.section === "apps")

    expect(regularTabs.map((t) => t.id)).toEqual(["1", "3"])
    expect(appTabs.map((t) => t.id)).toEqual(["2"])
  })

  it("includes recently closed tabs after regular tabs", () => {
    const sessionTabs = [createTab(1)]
    const recentlyClosed: SessionTab[] = [
      { sessionId: "closed1", title: "Closed", url: "https://closed.com", lastModified: 1000 },
    ]

    const sorted = sortTabsWithSections({
      sessionTabs,
      sessionWindows: [],
      augmentation: {},
      recentlyClosed,
    })

    expect(sorted[0].section).toBe("tabs")
    expect(sorted[1].section).toBe("recentlyClosed")
  })

  it("includes other device tabs last", () => {
    const sessionTabs = [createTab(1)]
    const otherDevices: DeviceSession[] = [
      {
        deviceName: "iPhone",
        tabs: [{ sessionId: "device1", title: "Phone Tab", url: "https://phone.com", lastModified: 1000 }],
      },
    ]

    const sorted = sortTabsWithSections({
      sessionTabs,
      sessionWindows: [],
      augmentation: {},
      otherDevices,
    })

    const deviceTabs = sorted.filter((t) => t.section === "otherDevices")
    expect(deviceTabs).toHaveLength(1)
    expect(deviceTabs[0].deviceName).toBe("iPhone")
  })

  it("sorts regular tabs by lastActivated", () => {
    const sessionTabs = [
      createTab(1, { lastAccessed: 100 }),
      createTab(2, { lastAccessed: 300 }),
      createTab(3, { lastAccessed: 200 }),
    ]

    const sorted = sortTabsWithSections({
      sessionTabs,
      sessionWindows: [],
      augmentation: {},
      strategy: "lastActivated",
    })

    const regularTabs = sorted.filter((t) => t.section === "tabs")
    expect(regularTabs.map((t) => t.id)).toEqual(["2", "3", "1"])
  })
})
