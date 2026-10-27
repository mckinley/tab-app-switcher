/**
 * Extension Tab Management Adapter
 *
 * Extends ExtensionPlatformAdapter with full tab management capabilities.
 * Used in contexts with direct access to browser.tabs APIs (e.g., tabs.html page).
 */

import type { ActionResult } from "@tas/lib/platform"
import { ExtensionPlatformAdapter } from "./ExtensionPlatformAdapter"
import { createWindowWithUrls, moveTab, openSwitcherTab } from "../../utils/tabActions"

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
      await openSwitcherTab(tabId)
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
      await moveTab(parseInt(tabId), newIndex, targetWindowId)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async createWindowWithTabs(urls: string[]): Promise<ActionResult> {
    try {
      await createWindowWithUrls(urls)
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
