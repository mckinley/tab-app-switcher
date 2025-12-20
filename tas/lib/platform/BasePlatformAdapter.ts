/**
 * Base Platform Adapter
 *
 * Abstract base class providing default implementations for optional methods.
 * Platform-specific adapters extend this class and override what they support.
 */

import type { PlatformAdapter, PlatformCapabilities, ActionResult } from "./types"
import type { CommonSettings } from "../settings/types"

export abstract class BasePlatformAdapter<T extends CommonSettings> implements PlatformAdapter<T> {
  abstract capabilities: PlatformCapabilities
  abstract load(): Promise<T>
  abstract save<K extends keyof T>(key: K, value: T[K]): Promise<void>
  abstract subscribe(callback: (settings: Partial<T>) => void): () => void

  // Default implementations for optional methods
  async reorderTabs(_tabId: string, _newIndex: number, _targetWindowId?: number): Promise<ActionResult> {
    return { success: false, error: "Not supported" }
  }

  async createWindowWithTabs(_urls: string[]): Promise<ActionResult> {
    return { success: false, error: "Not supported" }
  }
}
