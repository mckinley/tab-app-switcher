import { useEffect, useState } from "react"

/**
 * Whether the extension's icon is pinned to the toolbar, or undefined where the browser doesn't
 * say (Firefox, Safari). It matters for speed: when the icon isn't pinned, Chrome animates it
 * out of the Extensions menu before it opens the popup, which holds up the switcher by about
 * 0.3 seconds on every Alt+Tab. Pinned, the popup opens in a few hundredths of a second.
 */
export function useToolbarPinned(): boolean | undefined {
  const [pinned, setPinned] = useState<boolean>()

  useEffect(() => {
    const action = browser.action
    if (!action?.getUserSettings) return

    const check = () => {
      action.getUserSettings().then(
        (settings) => setPinned(settings.isOnToolbar),
        () => {},
      )
    }
    check()
    // Pinning happens outside the page; Chrome 130+ reports it, older versions on refocus
    action.onUserSettingsChanged?.addListener(check)
    window.addEventListener("focus", check)
    return () => {
      action.onUserSettingsChanged?.removeListener(check)
      window.removeEventListener("focus", check)
    }
  }, [])

  return pinned
}

/** How to pin the extension, in the browser's own words */
export function pinInstructions(browserType: string): string {
  return browserType === "edge"
    ? "Click the Extensions button (the puzzle piece) in the toolbar, then the eye icon next to Tab Application Switcher to show it in the toolbar."
    : "Click the Extensions button (the puzzle piece) in the toolbar, then the pin next to Tab Application Switcher."
}
