/**
 * Native Tab Management Adapter
 *
 * Extends NativePlatformAdapter with full tab management capabilities.
 * Used in the tab-management window which needs reorder and createWindow support.
 */

import type { ActionResult } from '@tas/lib/platform'
import { NativePlatformAdapter } from './NativePlatformAdapter'

export class NativeTabManagementAdapter extends NativePlatformAdapter {
  constructor() {
    super()
    // Enable full tab management capabilities
    this.actionCapabilities = {
      canActivateTab: true,
      canCloseTab: true,
      canRefreshTabs: true,
      canReorderTabs: true,
      canCreateWindow: true
    }
    // Update capabilities reference
    this.capabilities = {
      ...this.capabilities,
      actions: this.actionCapabilities
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Override actions with IPC commands to extension
  // ─────────────────────────────────────────────────────────────────────────────

  async reorderTabs(
    tabId: string,
    newIndex: number,
    targetWindowId?: number
  ): Promise<ActionResult> {
    // Send command through main process -> WebSocket -> Extension
    window.electron.ipcRenderer.send('command-to-extension', {
      command: 'reorderTab',
      tabId,
      newIndex,
      targetWindowId
    })
    return { success: true }
  }

  async createWindowWithTabs(urls: string[]): Promise<ActionResult> {
    // Send command through main process -> WebSocket -> Extension
    window.electron.ipcRenderer.send('command-to-extension', {
      command: 'createWindow',
      urls
    })
    return { success: true }
  }
}

/**
 * Singleton instance of the tab management adapter
 */
export const nativeTabManagementAdapter = new NativeTabManagementAdapter()
