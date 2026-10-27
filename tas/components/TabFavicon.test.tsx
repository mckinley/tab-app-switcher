import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { TabFavicon } from "./TabFavicon"

describe("TabFavicon", () => {
  it("shows web and site-relative favicons, and the fallback for browser-internal ones", () => {
    const src = (url: string) =>
      render(<TabFavicon src={url} />)
        .container.querySelector("img")!
        .getAttribute("src")

    expect(src("https://example.com/favicon.ico")).toBe("https://example.com/favicon.ico")
    expect(src("/favicons/nrdc.ico")).toBe("/favicons/nrdc.ico")
    expect(src("chrome://favicon/https://example.com")).toMatch(/^data:image\/svg\+xml/)
  })
})
