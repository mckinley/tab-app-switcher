/**
 * NativeSettings - Settings panel for native app options
 *
 * Configures native app behavior: launch on login, menu bar visibility, and updates.
 */
import { useEffect, useState } from "react"
import { Button } from "@tab-app-switcher/ui/components/button"
import { Separator } from "@tab-app-switcher/ui/components/separator"
import type { UpdateStatus } from "../../types/updates"

export interface NativeOptionsData {
  launchOnLogin: boolean
  hideMenuBarIcon: boolean
  checkUpdatesAutomatically: boolean
}

export interface NativeSettingsProps {
  /** Callback to get current options */
  getOptions?: () => Promise<NativeOptionsData & { theme: string }>
  /** Callback to set an option */
  setOption?: (key: string, value: unknown) => Promise<boolean>
  /** Callback to check for updates now */
  checkForUpdates?: () => Promise<UpdateStatus>
  /** Restart the app to install a downloaded update */
  installUpdate?: () => void
  /** Additional CSS classes */
  className?: string
}

function describeUpdateStatus(status: UpdateStatus): string {
  switch (status.state) {
    case "up-to-date":
      return `You have the latest version (${status.version}).`
    case "downloading":
      return `Downloading version ${status.version}. It installs the next time the app restarts.`
    case "ready":
      return `Version ${status.version} is ready to install.`
    default:
      return status.message
  }
}

export const NativeSettings = ({
  getOptions,
  setOption,
  checkForUpdates,
  installUpdate,
  className,
}: NativeSettingsProps) => {
  const [options, setOptions] = useState<NativeOptionsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | "checking" | null>(null)

  const handleCheckForUpdates = async (): Promise<void> => {
    if (!checkForUpdates) return
    setUpdateStatus("checking")
    try {
      setUpdateStatus(await checkForUpdates())
    } catch {
      setUpdateStatus({ state: "error", message: "Couldn't check for updates. Try again later." })
    }
  }

  useEffect(() => {
    const loadOptions = async (): Promise<void> => {
      if (getOptions) {
        try {
          const opts = await getOptions()
          setOptions({
            launchOnLogin: opts.launchOnLogin,
            hideMenuBarIcon: opts.hideMenuBarIcon,
            checkUpdatesAutomatically: opts.checkUpdatesAutomatically,
          })
        } catch (error) {
          console.error("Failed to load options:", error)
        }
      }
      setIsLoading(false)
    }
    loadOptions()
  }, [getOptions])

  const handleOptionChange = async (key: keyof NativeOptionsData, value: boolean): Promise<void> => {
    if (!setOption || !options) return

    try {
      await setOption(key, value)
      setOptions({ ...options, [key]: value })
    } catch (error) {
      console.error("Failed to save option:", error)
    }
  }

  if (isLoading) {
    return (
      <div className={className}>
        <div className="py-4 text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Startup Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Startup</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options?.launchOnLogin ?? false}
              onChange={(e) => handleOptionChange("launchOnLogin", e.target.checked)}
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
                onChange={(e) => handleOptionChange("hideMenuBarIcon", e.target.checked)}
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
              onChange={(e) => handleOptionChange("checkUpdatesAutomatically", e.target.checked)}
              className="w-4 h-4 rounded border-input accent-primary"
            />
            <span className="text-sm">Check for updates automatically</span>
          </label>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckForUpdates}
              disabled={!checkForUpdates || updateStatus === "checking"}
            >
              {updateStatus === "checking" ? "Checking..." : "Check for Updates..."}
            </Button>
            {updateStatus !== "checking" && updateStatus?.state === "ready" && installUpdate && (
              <Button size="sm" onClick={installUpdate}>
                Restart to Install
              </Button>
            )}
          </div>
          {updateStatus && updateStatus !== "checking" && (
            <p className="text-xs text-muted-foreground" role="status">
              {describeUpdateStatus(updateStatus)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
