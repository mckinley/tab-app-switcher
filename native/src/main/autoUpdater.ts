import pkg from 'electron-updater'
import { app } from 'electron'
import type { UpdateStatus } from '@tas/types/updates'

const { autoUpdater } = pkg

let updateDownloaded = false
// The version being downloaded or ready to install, once an update is found
let updateVersion: string | null = null

export function isUpdateReady(): boolean {
  return updateDownloaded
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}

/** Updates come from GitHub Releases, which only the installed (packaged) app can use */
function canUpdate(): boolean {
  return process.env.NODE_ENV !== 'development' && app.isPackaged
}

/**
 * Check now (Settings → Check for Updates). A newer version downloads in the background and
 * installs on quit, or right away with installUpdate().
 */
export async function checkForUpdatesNow(): Promise<UpdateStatus> {
  if (!canUpdate()) {
    return { state: 'unavailable', message: 'Updates are only available in the installed app.' }
  }
  if (updateDownloaded && updateVersion) return { state: 'ready', version: updateVersion }

  try {
    const result = await autoUpdater.checkForUpdates()
    if (!result?.isUpdateAvailable) return { state: 'up-to-date', version: app.getVersion() }
    return { state: 'downloading', version: result.updateInfo.version }
  } catch (error) {
    console.error('Auto-updater error:', error)
    return { state: 'error', message: "Couldn't reach the update server. Try again later." }
  }
}

export function setupAutoUpdater(callbacks: {
  onUpdateReady: () => void
  /** The "Check for updates automatically" setting */
  checkAutomatically: () => boolean
}): void {
  // Configure logging
  autoUpdater.logger = console

  // Don't check for updates in development
  if (!canUpdate()) {
    console.log('Auto-updater disabled in development mode')
    return
  }

  const checkForUpdates = (): void => {
    if (updateDownloaded || !callbacks.checkAutomatically()) return
    autoUpdater.checkForUpdatesAndNotify()
  }

  // Check for updates on startup (after 10 seconds)
  setTimeout(() => {
    console.log('Checking for updates...')
    checkForUpdates()
  }, 10000)

  // Check for updates every hour
  setInterval(
    () => {
      console.log('Checking for updates (periodic check)...')
      checkForUpdates()
    },
    60 * 60 * 1000
  )

  // Listen to update events
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info)
    updateVersion = info.version
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`
    console.log(logMessage)
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded - will install on quit:', info)
    updateDownloaded = true
    updateVersion = info.version
    callbacks.onUpdateReady()
  })

  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error)
  })
}
