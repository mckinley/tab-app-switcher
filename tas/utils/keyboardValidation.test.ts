import { describe, it, expect } from "vitest"
import { validateKey, validateKeyboard, getKeyWarning } from "./keyboardValidation"

describe("keyboardValidation", () => {
  describe("validateKey", () => {
    it("should validate a valid key", () => {
      const result = validateKey("Alt", "Tab", "Test")
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("should detect browser shortcuts", () => {
      const result = validateKey("Cmd", "W", "Test")
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain("browser shortcut")
    })

    it("should warn about macOS Option special characters", () => {
      const result = validateKey("Alt", "A", "Test")
      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toContain("Option+A")
    })

    it("should detect empty keys", () => {
      const result = validateKey("Alt", "", "Test")
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain("cannot be empty")
    })
  })

  describe("validateKeyboard", () => {
    it("should validate all keys successfully", () => {
      const keyboard = {
        modifier: "Alt",
        activateForward: "Tab",
        activateBackward: "Q",
        closeTab: "W",
        search: "S",
      }
      const result = validateKeyboard(keyboard)
      expect(result.isValid).toBe(true)
    })

    it("should detect duplicate keys", () => {
      const keyboard = {
        modifier: "Alt",
        activateForward: "Tab",
        activateBackward: "Tab",
        closeTab: "W",
        search: "S",
      }
      const result = validateKeyboard(keyboard)
      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes("Duplicate keys"))).toBe(true)
    })
  })

  describe("getKeyWarning", () => {
    it("should return null for valid keys", () => {
      expect(getKeyWarning("Alt", "Tab")).toBeNull()
    })

    it("should return error message for browser shortcuts", () => {
      const warning = getKeyWarning("Cmd", "W")
      expect(warning).toContain("❌")
      expect(warning).toContain("browser shortcut")
    })

    it("should return warning for macOS special characters", () => {
      const warning = getKeyWarning("Alt", "A")
      expect(warning).toContain("⚠️")
    })
  })
})
