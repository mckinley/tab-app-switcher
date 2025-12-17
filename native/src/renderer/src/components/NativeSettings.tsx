import { useEffect, useState } from 'react'
import { Button } from '@tab-app-switcher/ui/components/button'
import { Separator } from '@tab-app-switcher/ui/components/separator'

interface NativeOptions {
  launchOnLogin: boolean
  hideMenuBarIcon: boolean
  checkUpdatesAutomatically: boolean
}

interface NativeSettingsProps {
  getOptions?: () => Promise<NativeOptions & { theme: string }>
  setOption?: (key: string, value: unknown) => Promise<boolean>
  checkForUpdates?: () => void
}

export const NativeSettings = ({
  getOptions,
  setOption,
  checkForUpdates
}: NativeSettingsProps): JSX.Element => {
  const [options, setOptions] = useState<NativeOptions | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadOptions = async (): Promise<void> => {
      if (getOptions) {
        try {
          const opts = await getOptions()
          setOptions({
            launchOnLogin: opts.launchOnLogin,
            hideMenuBarIcon: opts.hideMenuBarIcon,
            checkUpdatesAutomatically: opts.checkUpdatesAutomatically
          })
        } catch (error) {
          console.error('Failed to load options:', error)
        }
      }
      setIsLoading(false)
    }
    loadOptions()
  }, [getOptions])

  const handleOptionChange = async (key: keyof NativeOptions, value: boolean): Promise<void> => {
    if (!setOption || !options) return

    try {
      await setOption(key, value)
      setOptions({ ...options, [key]: value })
    } catch (error) {
      console.error('Failed to save option:', error)
    }
  }

  if (isLoading) {
    return <div className="py-4 text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Startup Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Startup</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={options?.launchOnLogin ?? false}
            onChange={(e) => handleOptionChange('launchOnLogin', e.target.checked)}
            className="w-4 h-4 rounded border-input accent-primary"
          />
          <span className="text-sm">Launch on login</span>
        </label>
      </div>

      <Separator />

      {/* Menu Bar Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Menu Bar</h3>
        <div className="space-y-1">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options?.hideMenuBarIcon ?? false}
              onChange={(e) => handleOptionChange('hideMenuBarIcon', e.target.checked)}
              className="w-4 h-4 rounded border-input accent-primary"
            />
            <span className="text-sm">Hide menu bar icon</span>
          </label>
          <p className="text-xs text-muted-foreground pl-7">
            When hidden, relaunch the app from Finder to show settings
          </p>
        </div>
      </div>

      <Separator />

      {/* Updates Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Updates</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={options?.checkUpdatesAutomatically ?? true}
            onChange={(e) => handleOptionChange('checkUpdatesAutomatically', e.target.checked)}
            className="w-4 h-4 rounded border-input accent-primary"
          />
          <span className="text-sm">Check for updates automatically</span>
        </label>

        <Button variant="outline" size="sm" onClick={checkForUpdates}>
          Check for Updates...
        </Button>
      </div>
    </div>
  )
}
