/**
 * Settings Context
 *
 * Provides React context for settings management across platforms.
 * Each platform provides its own adapter implementation.
 */

/* eslint-disable react-refresh/only-export-components -- Exports context alongside provider */
import { createContext, useState, useEffect, type ReactNode } from "react"
import type { CommonSettings, SettingsAdapter, SettingsContextValue } from "./types"

/**
 * React context for settings
 * Uses CommonSettings as the base type - consumers can narrow with generics
 */
export const SettingsContext = createContext<SettingsContextValue<CommonSettings> | null>(null)

export interface SettingsProviderProps<T extends CommonSettings> {
  /** Platform-specific settings adapter */
  adapter: SettingsAdapter<T>
  /** Children to render */
  children: ReactNode
}

/**
 * Settings provider component
 * Wraps children with settings context using the provided adapter
 */
export function SettingsProvider<T extends CommonSettings>({
  adapter,
  children,
}: SettingsProviderProps<T>): JSX.Element {
  const [settings, setSettings] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [version, setVersion] = useState<string | undefined>()

  // Load initial settings
  useEffect(() => {
    let mounted = true

    async function loadSettings(): Promise<void> {
      try {
        const loaded = await adapter.load()
        if (mounted) {
          setSettings(loaded)
          setIsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setIsLoading(false)
        }
      }
    }

    loadSettings()

    // Load version if available
    if (adapter.getVersion) {
      adapter.getVersion().then((v) => {
        if (mounted) setVersion(v)
      })
    }

    return () => {
      mounted = false
    }
  }, [adapter])

  // Subscribe to external changes
  useEffect(() => {
    if (!adapter.subscribe) return

    return adapter.subscribe((partialSettings) => {
      setSettings((prev) => (prev ? { ...prev, ...partialSettings } : null))
    })
  }, [adapter])

  const updateSetting = async <K extends keyof T>(key: K, value: T[K]): Promise<void> => {
    if (!settings) return

    // Optimistic update
    const previousSettings = settings
    setSettings({ ...settings, [key]: value })

    try {
      await adapter.save(key, value)
    } catch (err) {
      // Revert on error
      setSettings(previousSettings)
      throw err
    }
  }

  const contextValue: SettingsContextValue<T> = {
    settings,
    isLoading,
    error,
    updateSetting,
    version,
  }

  return (
    <SettingsContext.Provider value={contextValue as unknown as SettingsContextValue<CommonSettings>}>
      {children}
    </SettingsContext.Provider>
  )
}
