import type { Tab } from "../types/tabs"

/**
 * Demo tab pool - represents potential tabs that can be opened in demo mode.
 * Used by the website to provide a realistic demo experience.
 */
export const DEMO_TAB_POOL: Tab[] = [
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
 * Get a shuffled copy of the demo tabs
 */
export function getShuffledDemoTabs(): Tab[] {
  const shuffled = [...DEMO_TAB_POOL]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
