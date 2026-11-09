// @vitest-environment node
import type { ComponentType } from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"
import IndexIsland from "./IndexIsland"
import AboutIsland from "./AboutIsland"
import DownloadsIsland from "./DownloadsIsland"

// The public pages are rendered to HTML at build time (client:load), so search engines get their
// text without running the page. Rendering them must not touch the browser (window, localStorage).
describe("public pages render without a browser", () => {
  it.each<[string, ComponentType, string[]]>([
    ["home", IndexIsland, ["Like your system", "Features", "Default Keyboard Shortcuts", 'href="/downloads"']],
    ["About", AboutIsland, ["Getting Started", "Compare", "Privacy Policy", "Support"]],
    ["Downloads", DownloadsIsland, ["Download TAS", "Browser Extensions", "Native UI Apps", "Why Two Downloads?"]],
  ])("%s", (_, Island, texts) => {
    const html = renderToString(<Island />)
    for (const text of texts) expect(html).toContain(text)
  })
})
