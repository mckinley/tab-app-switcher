import pkg from 'electron-updater'
import { app } from 'electron'

const { autoUpdater } = pkg

export function setupAutoUpdater(): void {
  // Configure logging
  autoUpdater.logger = console

  // Don't check for updates in development
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    console.log('Auto-updater disabled in development mode')
    return
  }

  let updateDownloaded = false

  const checkForUpdates = (): void => {
    if (updateDownloaded) return
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
  })

  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error)
  })
}
