import { describe, it, expect } from "vitest"
import { getShuffledDemoTabs } from "./demoTabs"
import { formatRelativeTime } from "./relativeTime"

describe("getShuffledDemoTabs", () => {
  it("dates each tab by its place in the list, so the first was used just now", () => {
    for (let run = 0; run < 20; run++) {
      const tabs = getShuffledDemoTabs()
      const times = tabs.map((t) => t.lastActivated!)

      expect(formatRelativeTime(times[0])).toBe("now")
      expect([...times].sort((a, b) => b - a)).toEqual(times)
    }
  })
})
