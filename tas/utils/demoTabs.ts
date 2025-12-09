import type { Tab } from "../types/tabs"

/**
 * Generate demo lastActiveTime values relative to now
 * Creates realistic "X min ago" / "X hours ago" patterns
 */
function generateDemoTimestamps(): number[] {
  const now = Date.now()
  return [
    now - 5 * 1000, // 5 seconds ago (shows as "now")
    now - 2 * 60 * 1000, // 2 min ago
    now - 15 * 60 * 1000, // 15 min ago
    now - 45 * 60 * 1000, // 45 min ago
    now - 2 * 60 * 60 * 1000, // 2 hours ago
    now - 5 * 60 * 60 * 1000, // 5 hours ago
    now - 24 * 60 * 60 * 1000, // Yesterday
    now - 3 * 24 * 60 * 60 * 1000, // 3 days ago
  ]
}

/**
 * Demo tab pool - represents potential tabs that can be opened in demo mode.
 * Used by the website to provide a realistic demo experience.
 */
const DEMO_TAB_POOL_BASE: Omit<Tab, "lastActiveTime">[] = [
  {
    id: "1",
    title: "NRDC",
    url: "https://www.nrdc.org/",
    favicon: "/favicons/nrdc.ico",
  },
  {
    id: "2",
    title: "Sierra Club",
    url: "https://www.sierraclub.org/",
    favicon: "/favicons/sierraclub.png",
  },
  {
    id: "3",
    title: "Greenpeace",
    url: "https://www.greenpeace.org/",
    favicon: "/favicons/greenpeace.ico",
  },
  {
    id: "4",
    title: "WWF (World Wildlife Fund)",
    url: "https://www.worldwildlife.org/",
    favicon: "/favicons/wwf.ico",
  },
  {
    id: "5",
    title: "Amnesty International",
    url: "https://www.amnesty.org/",
    favicon: "/favicons/amnesty.png",
  },
  {
    id: "6",
    title: "Human Rights Watch",
    url: "https://www.hrw.org/",
    favicon: "/favicons/hrw.ico",
  },
  {
    id: "7",
    title: "International Rescue Committee",
    url: "https://www.rescue.org/",
    favicon: "/favicons/irc.ico",
  },
  {
    id: "8",
    title: "Doctors Without Borders",
    url: "https://www.doctorswithoutborders.org/",
    favicon: "/favicons/msf.ico",
  },
]

/**
 * Get demo tabs with generated lastActiveTime values
 */
function getDemoTabsWithTimestamps(): Tab[] {
  const timestamps = generateDemoTimestamps()
  return DEMO_TAB_POOL_BASE.map((tab, index) => ({
    ...tab,
    lastActiveTime: timestamps[index],
  }))
}

export const DEMO_TAB_POOL: Tab[] = getDemoTabsWithTimestamps()

/**
 * Get a shuffled copy of the demo tabs with fresh timestamps
 */
export function getShuffledDemoTabs(): Tab[] {
  const tabs = getDemoTabsWithTimestamps()
  for (let i = tabs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[tabs[i], tabs[j]] = [tabs[j], tabs[i]]
  }
  return tabs
}
