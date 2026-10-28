// @vitest-environment node
import { describe, it, expect } from "vitest"
import type { APIContext } from "astro"
import { onRequest } from "./middleware"

const SITE = "https://tabappswitcher.com"

async function status(path: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
  const request = new Request(`${SITE}${path}`, init)
  const context = { request, url: new URL(request.url), isPrerendered: false } as unknown as APIContext
  const response = await onRequest(context, async () => new Response("ok"))
  return (response as Response).status
}

describe("cross-site form check", () => {
  it("refuses form posts from other sites", async () => {
    const form = {
      method: "POST",
      headers: { Origin: "https://evil.example", "Content-Type": "application/x-www-form-urlencoded" },
    }
    expect(await status("/api/auth/sign-out", form)).toBe(403)
    expect(await status("/api/collections", { method: "POST", headers: { Origin: "https://evil.example" } })).toBe(403)
  })

  it("lets Sign in with Apple post its result to the callback", async () => {
    const apple = {
      method: "POST",
      headers: { Origin: "https://appleid.apple.com", "Content-Type": "application/x-www-form-urlencoded" },
    }
    expect(await status("/api/auth/callback/apple", apple)).toBe(200)
    expect(await status("/api/auth/callback/google", apple)).toBe(403)
  })

  it("allows same-origin posts, JSON from the apps, and reads", async () => {
    const sameOrigin = {
      method: "POST",
      headers: { Origin: SITE, "Content-Type": "application/x-www-form-urlencoded" },
    }
    expect(await status("/api/auth/sign-out", sameOrigin)).toBe(200)
    const app = { method: "POST", headers: { Origin: "chrome-extension://abc", "Content-Type": "application/json" } }
    expect(await status("/api/app-auth/token", app)).toBe(200)
    // The apps sign out with their token and no body
    const signOut = { method: "POST", headers: { Origin: "chrome-extension://abc", Authorization: "Bearer token" } }
    expect(await status("/api/auth/sign-out", signOut)).toBe(200)
    expect(await status("/api/auth/get-session", { headers: { Origin: "https://evil.example" } })).toBe(200)
  })
})
