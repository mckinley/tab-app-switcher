import { describe, it, expect } from "vitest"
import {
  getTabTimestamp,
  sortByLastActivated,
  sortByWindowGrouped,
  sortByLastAccessed,
  sortByLastDeactivated,
  applySortStrategy,
} from "./strategies"
import type { BrowserTab, TabAugmentation } from "../types/protocol"

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

describe("getTabTimestamp", () => {
  it("returns lastActivated from augmentation when available", () => {
    const tab = createTab(1, { lastAccessed: 1000 })
    const aug: TabAugmentation = { lastActivated: 2000 }
    expect(getTabTimestamp(tab, aug)).toBe(2000)
  })

  it("falls back to lastAccessed when no augmentation", () => {
    const tab = createTab(1, { lastAccessed: 1000 })
    expect(getTabTimestamp(tab)).toBe(1000)
  })

  it("falls back to lastAccessed when augmentation has no lastActivated", () => {
    const tab = createTab(1, { lastAccessed: 1000 })
    const aug: TabAugmentation = { faviconDataUrl: "data:..." }
    expect(getTabTimestamp(tab, aug)).toBe(1000)
  })

  it("returns 0 when no timestamp available", () => {
    const tab = createTab(1)
    expect(getTabTimestamp(tab)).toBe(0)
  })
})

describe("sortByLastActivated", () => {
  it("sorts tabs by lastActivated descending (most recent first)", () => {
    const tabs = [
      createTab(1, { lastAccessed: 100 }),
      createTab(2, { lastAccessed: 300 }),
      createTab(3, { lastAccessed: 200 }),
    ]
    const augmentation: Record<string, TabAugmentation> = {
      "1": { lastActivated: 100 },
      "2": { lastActivated: 300 },
      "3": { lastActivated: 200 },
    }

    const sorted = sortByLastActivated(tabs, augmentation)
    expect(sorted.map((t) => t.id)).toEqual([2, 3, 1])
  })

  it("uses lastAccessed as fallback when no augmentation", () => {
    const tabs = [
      createTab(1, { lastAccessed: 100 }),
      createTab(2, { lastAccessed: 300 }),
      createTab(3, { lastAccessed: 200 }),
    ]

    const sorted = sortByLastActivated(tabs, {})
    expect(sorted.map((t) => t.id)).toEqual([2, 3, 1])
  })

  it("does not mutate original array", () => {
    const tabs = [createTab(1), createTab(2)]
    const original = [...tabs]
    sortByLastActivated(tabs, {})
    expect(tabs).toEqual(original)
  })

  it("handles empty array", () => {
    const sorted = sortByLastActivated([], {})
    expect(sorted).toEqual([])
  })

  it("handles single tab", () => {
    const tabs = [createTab(1, { lastAccessed: 100 })]
    const sorted = sortByLastActivated(tabs, {})
    expect(sorted.map((t) => t.id)).toEqual([1])
  })
})

describe("sortByWindowGrouped", () => {
  it("groups tabs by window and sorts windows by most recent tab", () => {
    const tabs = [
      createTab(1, { windowId: 1, lastAccessed: 100 }),
      createTab(2, { windowId: 2, lastAccessed: 300 }), // Window 2 has most recent
      createTab(3, { windowId: 1, lastAccessed: 200 }),
    ]
    const augmentation: Record<string, TabAugmentation> = {
      "1": { lastActivated: 100 },
      "2": { lastActivated: 300 },
      "3": { lastActivated: 200 },
    }

    const sorted = sortByWindowGrouped(tabs, augmentation)
    // Window 2 should come first (has tab with lastActivated=300)
    // Then Window 1, sorted by lastActivated (tab 3, then tab 1)
    expect(sorted.map((t) => t.id)).toEqual([2, 3, 1])
  })

  it("sorts tabs within each window by lastActivated", () => {
    const tabs = [
      createTab(1, { windowId: 1, lastAccessed: 100 }),
      createTab(2, { windowId: 1, lastAccessed: 300 }),
      createTab(3, { windowId: 1, lastAccessed: 200 }),
    ]

    const sorted = sortByWindowGrouped(tabs, {})
    expect(sorted.map((t) => t.id)).toEqual([2, 3, 1])
  })
})

describe("sortByLastAccessed", () => {
  it("sorts by browser lastAccessed, ignoring augmentation", () => {
    const tabs = [
      createTab(1, { lastAccessed: 100 }),
      createTab(2, { lastAccessed: 300 }),
      createTab(3, { lastAccessed: 200 }),
    ]
    // Augmentation has different order - should be ignored
    const augmentation: Record<string, TabAugmentation> = {
      "1": { lastActivated: 999 },
    }

    const sorted = sortByLastAccessed(tabs, augmentation)
    expect(sorted.map((t) => t.id)).toEqual([2, 3, 1])
  })
})

describe("sortByLastDeactivated", () => {
  it("sorts by lastDeactivated from augmentation", () => {
    const tabs = [createTab(1), createTab(2), createTab(3)]
    const augmentation: Record<string, TabAugmentation> = {
      "1": { lastDeactivated: 100 },
      "2": { lastDeactivated: 300 },
      "3": { lastDeactivated: 200 },
    }

    const sorted = sortByLastDeactivated(tabs, augmentation)
    expect(sorted.map((t) => t.id)).toEqual([2, 3, 1])
  })

  it("puts tabs without lastDeactivated at the end", () => {
    const tabs = [createTab(1), createTab(2), createTab(3)]
    const augmentation: Record<string, TabAugmentation> = {
      "2": { lastDeactivated: 300 },
    }

    const sorted = sortByLastDeactivated(tabs, augmentation)
    // Tab 2 first (has lastDeactivated), then 1 and 3 (both have 0)
    expect(sorted[0].id).toBe(2)
  })
})

describe("applySortStrategy", () => {
  const tabs = [createTab(1, { lastAccessed: 100 }), createTab(2, { lastAccessed: 300 })]

  it("applies lastActivated strategy", () => {
    const sorted = applySortStrategy("lastActivated", tabs, {})
    expect(sorted.map((t) => t.id)).toEqual([2, 1])
  })

  it("applies lastAccessed strategy", () => {
    const sorted = applySortStrategy("lastAccessed", tabs, {})
    expect(sorted.map((t) => t.id)).toEqual([2, 1])
  })

  it("defaults to lastActivated for unknown strategy", () => {
    const sorted = applySortStrategy("unknown" as any, tabs, {})
    expect(sorted.map((t) => t.id)).toEqual([2, 1])
  })
})
