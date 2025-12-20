import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { NativePlatformProvider, useSettings } from './lib/platform'
import type { NativeSettings } from '@tas/lib/settings'
import appIcon from '../../../resources/icon.png'
import './assets/globals.css'

function AboutContent(): JSX.Element {
  const { version } = useSettings<NativeSettings>()
  const [commitHash, setCommitHash] = useState<string | null>(null)

  // Load commit hash from about API
  useEffect(() => {
    if (window.api?.about?.getAboutInfo) {
      window.api.about.getAboutInfo().then((info) => {
        setCommitHash(info.commitHash)
      })
    }
  }, [])

  const currentYear = new Date().getFullYear()

  return (
    <div className="w-full h-full bg-background flex flex-col items-center justify-center p-8 select-none">
      {/* App Icon */}
      <img src={appIcon} alt="TAS" className="w-20 h-20 mb-4" />

      {/* App Name */}
      <h1 className="text-lg font-semibold text-foreground mb-1">TAS</h1>

      {/* Version */}
      <p className="text-sm text-muted-foreground mb-1">Version {version ?? '...'}</p>

      {/* Build Info */}
      {commitHash && (
        <p className="text-xs text-muted-foreground/70 font-mono mb-6">
          Build {commitHash.substring(0, 7)}
        </p>
      )}

      {/* Copyright */}
      <p className="text-xs text-muted-foreground text-center">
        Copyright © {currentYear} Bronson Oka
      </p>
      <p className="text-xs text-muted-foreground text-center mt-1">All rights reserved.</p>
    </div>
  )
}

function AboutApp(): JSX.Element {
  return (
    <NativePlatformProvider>
      <AboutContent />
    </NativePlatformProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AboutApp />
  </StrictMode>
)
