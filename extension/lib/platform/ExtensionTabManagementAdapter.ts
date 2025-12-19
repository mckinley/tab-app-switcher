/**
 * Extension Tab Management Adapter
 *
 * Extends ExtensionPlatformAdapter with full tab management capabilities.
 * Used in contexts with direct access to browser.tabs APIs (e.g., tabs.html page).
 */

import type { ActionResult } from "@tas/lib/platform"
import { ExtensionPlatformAdapter } from "./ExtensionPlatformAdapter"

export class ExtensionTabManagementAdapter extends ExtensionPlatformAdapter {
  constructor() {
    super()
    // Enable full tab management capabilities
    this.actionCapabilities = {
      canActivateTab: true,
      canCloseTab: true,
      canRefreshTabs: true,
      canReorderTabs: true,
      canCreateWindow: true,
    }
    // Update capabilities reference
    this.capabilities = {
      ...this.capabilities,
      actions: this.actionCapabilities,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Override actions with direct browser API calls
  // ─────────────────────────────────────────────────────────────────────────────

  async activateTab(tabId: string): Promise<ActionResult> {
    try {
      await browser.tabs.update(parseInt(tabId), { active: true })
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async closeTab(tabId: string): Promise<ActionResult> {
    try {
      await browser.tabs.remove(parseInt(tabId))
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async reorderTabs(tabId: string, newIndex: number, targetWindowId?: number): Promise<ActionResult> {
    try {
      const numericTabId = parseInt(tabId)
      const tab = await browser.tabs.get(numericTabId)

      await browser.tabs.move(numericTabId, {
        windowId: targetWindowId ?? tab.windowId,
        index: newIndex,
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async createWindowWithTabs(urls: string[]): Promise<ActionResult> {
    try {
      if (urls.length === 0) {
        return { success: true }
      }

      const newWindow = await browser.windows.create({
        url: urls[0],
        focused: true,
      })

      if (newWindow?.id) {
        for (let i = 1; i < urls.length; i++) {
          await browser.tabs.create({
            windowId: newWindow.id,
            url: urls[i],
            active: false,
          })
        }
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
}

/**
 * Singleton instance of the tab management adapter
 */
export const extensionTabManagementAdapter = new ExtensionTabManagementAdapter()
