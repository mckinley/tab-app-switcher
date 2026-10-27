import { describe, it, expect } from "vitest"
import { safeReturnTo } from "./safeReturnTo"

describe("safeReturnTo", () => {
  it.each(["/account", "/collections", "/collections?tab=1#top"])("keeps the site path %s", (path) => {
    expect(safeReturnTo(path)).toBe(path)
  })

  it.each([
    null,
    "",
    "javascript:alert(1)",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "collections",
  ])("falls back for %j", (value) => {
    expect(safeReturnTo(value)).toBe("/account")
  })

  it("leaves a path on this site after the browser resolves it", () => {
    for (const value of ["/collections", "//evil.example", "/\t/evil.example", "javascript:alert(1)"]) {
      const url = new URL(safeReturnTo(value), "https://tabappswitcher.com")
      expect(url.origin).toBe("https://tabappswitcher.com")
    }
  })
})
