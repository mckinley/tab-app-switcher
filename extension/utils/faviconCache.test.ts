import { describe, it, expect, beforeEach, vi } from "vitest"
import { getFaviconDataUrl, preloadFavicons, clearFaviconCache, getFaviconCacheStats } from "./faviconCache"

// Mock fetch
global.fetch = vi.fn()

describe("faviconCache", () => {
  beforeEach(() => {
    clearFaviconCache()
    vi.clearAllMocks()
  })

  describe("getFaviconDataUrl", () => {
    it("should return fallback for empty URL", async () => {
      const result = await getFaviconDataUrl("")
      expect(result).toContain("data:image/svg+xml")
    })

    it("should fetch and cache favicon", async () => {
      const mockBlob = new Blob(["fake-image"], { type: "image/png" })
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      })

      const url = "https://example.com/favicon.ico"
      const result = await getFaviconDataUrl(url)

      expect(global.fetch).toHaveBeenCalledWith(url)
      expect(result).toContain("data:")

      // Check cache
      const stats = getFaviconCacheStats()
      expect(stats.size).toBe(1)
    })

    it("should use cached favicon on second call", async () => {
      const mockBlob = new Blob(["fake-image"], { type: "image/png" })
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      })

      const url = "https://example.com/favicon.ico"

      // First call - should fetch
      await getFaviconDataUrl(url)
      expect(global.fetch).toHaveBeenCalledTimes(1)

      // Second call - should use cache
      await getFaviconDataUrl(url)
      expect(global.fetch).toHaveBeenCalledTimes(1) // Still 1, not 2
    })

    it("should return fallback on fetch error", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})
      ;(global.fetch as any).mockRejectedValueOnce(new Error("Network error"))

      const url = "https://example.com/favicon.ico"
      const result = await getFaviconDataUrl(url)

      expect(result).toContain("data:image/svg+xml")
      consoleSpy.mockRestore()
    })

    it("should convert any blob to data URL", async () => {
      const mockBlob = new Blob(["some-content"], { type: "text/html" })
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      })

      const url = "https://example.com/favicon.ico"
      const result = await getFaviconDataUrl(url)

      // Should convert whatever blob we get to data URL
      expect(result).toContain("data:")
    })
  })

  describe("preloadFavicons", () => {
    it("should preload multiple favicons", async () => {
      const mockBlob = new Blob(["fake-image"], { type: "image/png" })
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      })

      const urls = ["https://example.com/1.ico", "https://example.com/2.ico", "https://example.com/3.ico"]

      await preloadFavicons(urls)

      expect(global.fetch).toHaveBeenCalledTimes(3)
      const stats = getFaviconCacheStats()
      expect(stats.size).toBe(3)
    })

    it("should skip already cached favicons", async () => {
      const mockBlob = new Blob(["fake-image"], { type: "image/png" })
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      })

      const urls = ["https://example.com/1.ico", "https://example.com/2.ico"]

      // First preload
      await preloadFavicons(urls)
      expect(global.fetch).toHaveBeenCalledTimes(2)

      // Second preload with same URLs - should skip
      await preloadFavicons(urls)
      expect(global.fetch).toHaveBeenCalledTimes(2) // Still 2, not 4
    })

    it("should handle duplicate URLs in the same batch", async () => {
      const mockBlob = new Blob(["fake-image"], { type: "image/png" })
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      })

      const urls = ["https://example.com/1.ico", "https://example.com/1.ico", "https://example.com/2.ico"]

      await preloadFavicons(urls)

      // Should only fetch unique URLs
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe("clearFaviconCache", () => {
    it("should clear the cache", async () => {
      const mockBlob = new Blob(["fake-image"], { type: "image/png" })
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      })

      await getFaviconDataUrl("https://example.com/favicon.ico")

      let stats = getFaviconCacheStats()
      expect(stats.size).toBe(1)

      clearFaviconCache()

      stats = getFaviconCacheStats()
      expect(stats.size).toBe(0)
    })
  })
})
