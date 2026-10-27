import { describe, it, expect, vi, beforeEach } from "vitest"
import { createTabTracker, type TabTracker } from "./tabTracker"
import { browser, type Browser } from "wxt/browser"

// Mock the browser API
vi.mock("wxt/browser", () => ({
  browser: {
    tabs: {
      query: vi.fn(),
    },
    windows: {
      getAll: vi.fn(),
      WINDOW_ID_NONE: -1,
    },
    sessions: {
      getRecentlyClosed: vi.fn(),
      getDevices: vi.fn(),
    },
  },
}))

// Mock favicon cache to avoid network calls
vi.mock("./faviconCache", () => ({
  getFaviconDataUrl: vi.fn().mockResolvedValue("data:image/png;base64,mock"),
}))

// Helper to create a mock browser tab
function createMockTab(id: number, overrides: Partial<Browser.tabs.Tab> = {}): Browser.tabs.Tab {
  return {
    id,
    index: 0,
    windowId: 1,
    highlighted: false,
    active: false,
    pinned: false,
    incognito: false,
    frozen: false,
    selected: false,
    discarded: false,
    autoDiscardable: true,
    groupId: -1,
    ...overrides,
  }
}

describe("TabTracker", () => {
  let tracker: TabTracker

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1000000)
    tracker = createTabTracker()
  })

  describe("handleTabActivated", () => {
    it("sets lastActivated on the newly activated tab", () => {
      // First, manually add a tab to state (simulating initialize)
      const state = tracker.getState()
      state.sessionTabs.set(1, { id: 1, windowId: 1, index: 0 } as any)
      state.augmentation.set(1, {})

      tracker.handleTabActivated(1, 1)

      const aug = state.augmentation.get(1)
      expect(aug?.lastActivated).toBe(1000000)
    })

    it("sets lastDeactivated on the previously active tab", () => {
      const state = tracker.getState()
      state.sessionTabs.set(1, { id: 1, windowId: 1, index: 0 } as any)
      state.sessionTabs.set(2, { id: 2, windowId: 1, index: 1 } as any)
      state.augmentation.set(1, { lastActivated: 900000 })
      state.augmentation.set(2, {})

      // Activate tab 1 first
      tracker.handleTabActivated(1, 1)

      // Advance time
      vi.setSystemTime(1001000)

      // Now activate tab 2
      tracker.handleTabActivated(2, 1)

      // Tab 1 should have lastDeactivated set
      const aug1 = state.augmentation.get(1)
      expect(aug1?.lastDeactivated).toBe(1001000)

      // Tab 2 should have lastActivated set
      const aug2 = state.augmentation.get(2)
      expect(aug2?.lastActivated).toBe(1001000)
    })

    it("emits tab.activated event", () => {
      const handler = vi.fn()
      tracker.onEvent(handler)

      const state = tracker.getState()
      state.sessionTabs.set(1, { id: 1, windowId: 1, index: 0 } as any)
      state.augmentation.set(1, {})

      tracker.handleTabActivated(1, 1)

      expect(handler).toHaveBeenCalledWith({
        event: "tab.activated",
        tabId: 1,
        windowId: 1,
        timestamp: 1000000,
      })
    })
  })

  describe("handleTabCreated", () => {
    it("adds tab to state", () => {
      const tab = createMockTab(1, { title: "New Tab", url: "https://example.com" })

      tracker.handleTabCreated(tab)

      const state = tracker.getState()
      expect(state.sessionTabs.has(1)).toBe(true)
      expect(state.sessionTabs.get(1)?.title).toBe("New Tab")
    })

    it("initializes augmentation for the tab", () => {
      const tab = createMockTab(1, { lastAccessed: 500000 })

      tracker.handleTabCreated(tab)

      const state = tracker.getState()
      const aug = state.augmentation.get(1)
      expect(aug).toBeDefined()
    })

    it("emits tab.created event", () => {
      const handler = vi.fn()
      tracker.onEvent(handler)

      const tab = createMockTab(1)
      tracker.handleTabCreated(tab)

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "tab.created",
          tab: expect.objectContaining({ id: 1 }),
        }),
      )
    })
  })

  describe("handleTabRemoved", () => {
    it("removes tab from state", () => {
      const state = tracker.getState()
      state.sessionTabs.set(1, { id: 1, windowId: 1, index: 0 } as any)
      state.augmentation.set(1, { lastActivated: 1000 })

      tracker.handleTabRemoved(1, 1)

      expect(state.sessionTabs.has(1)).toBe(false)
      expect(state.augmentation.has(1)).toBe(false)
    })

    it("clears currentlyActiveTabId if removed tab was active", () => {
      const state = tracker.getState()
      state.sessionTabs.set(1, { id: 1, windowId: 1, index: 0 } as any)
      state.augmentation.set(1, {})
      tracker.handleTabActivated(1, 1) // Make it active

      expect(state.currentlyActiveTabId).toBe(1)

      tracker.handleTabRemoved(1, 1)

      expect(state.currentlyActiveTabId).toBeNull()
    })
  })
  describe("initialize", () => {
    const sessions = browser.sessions as any

    beforeEach(() => {
      vi.mocked(browser.tabs.query as () => Promise<Browser.tabs.Tab[]>).mockResolvedValue([
        createMockTab(1, { active: true, title: "One" }),
        createMockTab(2, { title: "Two" }),
      ])
      vi.mocked(browser.windows.getAll as () => Promise<Browser.windows.Window[]>).mockResolvedValue([
        { id: 1, focused: true } as any,
      ])
      sessions.getRecentlyClosed = vi.fn().mockResolvedValue([])
      sessions.getDevices = vi.fn().mockResolvedValue([])
    })

    it("reads tabs when the browser has no sessions API (Safari)", async () => {
      const saved = (browser as any).sessions
      ;(browser as any).sessions = undefined
      try {
        const snapshot = await tracker.initialize()
        expect(snapshot.sessionTabs.map((t) => t.id)).toEqual([1, 2])
        expect(snapshot.recentlyClosed).toEqual([])
        expect(snapshot.otherDevices).toEqual([])
      } finally {
        ;(browser as any).sessions = saved
      }
    })

    it("reads tabs when getDevices is missing or fails (Firefox)", async () => {
      sessions.getDevices = undefined
      await expect(tracker.initialize()).resolves.toMatchObject({ otherDevices: [] })

      sessions.getDevices = vi.fn().mockRejectedValue(new Error("getDevices is not supported"))
      const snapshot = await tracker.refresh()
      expect(snapshot.sessionTabs).toHaveLength(2)
      expect(snapshot.otherDevices).toEqual([])
    })

    it("stores recently closed times in seconds, whether the browser reports seconds or milliseconds", async () => {
      sessions.getRecentlyClosed = vi.fn().mockResolvedValue([
        { lastModified: 1_700_000_000, tab: { sessionId: "chrome", title: "Chrome", url: "https://a.test" } },
        { lastModified: 1_700_000_000_123, tab: { sessionId: "firefox", title: "Firefox", url: "https://b.test" } },
      ])

      const snapshot = await tracker.initialize()

      expect(snapshot.recentlyClosed?.map((t) => t.lastModified)).toEqual([1_700_000_000, 1_700_000_000])
    })

    it("refreshSessions picks up newly closed tabs", async () => {
      await tracker.initialize()
      sessions.getRecentlyClosed = vi
        .fn()
        .mockResolvedValue([
          { lastModified: 1_700_000_000, tab: { sessionId: "s1", title: "Closed", url: "https://c.test" } },
        ])

      await tracker.refreshSessions()

      expect(tracker.getSnapshot().recentlyClosed?.map((t) => t.title)).toEqual(["Closed"])
    })
  })
})
