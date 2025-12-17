import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import appIcon from '../../../resources/icon.png'
import './assets/globals.css'

interface AboutInfo {
  version: string
  commitHash: string
}

// eslint-disable-next-line react-refresh/only-export-components
function AboutApp(): JSX.Element {
  const [aboutInfo, setAboutInfo] = useState<AboutInfo | null>(null)

  // Apply system theme on mount
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Load about info
  useEffect(() => {
    if (window.api?.about?.getAboutInfo) {
      window.api.about.getAboutInfo().then(setAboutInfo)
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
      <p className="text-sm text-muted-foreground mb-1">Version {aboutInfo?.version ?? '...'}</p>

      {/* Build Info */}
      {aboutInfo?.commitHash && (
        <p className="text-xs text-muted-foreground/70 font-mono mb-6">
          Build {aboutInfo.commitHash.substring(0, 7)}
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AboutApp />
  </StrictMode>
)
