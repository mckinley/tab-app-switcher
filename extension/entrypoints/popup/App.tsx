import { useState, useEffect, useMemo } from "react"
import { TabSwitcher } from "@tas/components/TabSwitcher"
import { SwitcherContainer } from "@tas/components/SwitcherContainer"
import { DEFAULT_KEYBOARD_SETTINGS } from "@tas/types/tabs"
import { useTabNavigation } from "@tas/hooks/useTabNavigation"
import { usePopupMessages } from "../../lib/hooks/usePopupMessages"
import { pinInstructions, useToolbarPinned } from "../../lib/hooks/useToolbarPinned"
import {
  ExtensionPlatformProvider,
  useTabs,
  useTabActions,
  useSettings,
  useWindowActions,
  useBrowser,
} from "../../lib/platform"
import type { ExtensionSettings } from "@tas/lib/settings"
import "./globals.css"

function PopupContent() {
  const { tabs, isLoading } = useTabs()
  const { activateTab, closeTab, refreshTabs } = useTabActions()
  const { settings } = useSettings<ExtensionSettings>()
  const { selectedIndex, setSelectedIndex, navigate, onVisibleTabsChange } = useTabNavigation(tabs)
  const { openSettings, openTabManagement } = useWindowActions()
  const { openShortcutsPage, browserType } = useBrowser()

  // Get keyboard config from settings, falling back to defaults
  const keyboard = settings?.keyboard ?? DEFAULT_KEYBOARD_SETTINGS

  const handleSelectTab = (tabId: string) => {
    // Activate tab via adapter, then close popup (context-specific behavior)
    activateTab(tabId).then(() => {
      window.close()
    })
  }

  const handleCloseTab = (tabId: string) => {
    // Close tab via adapter - tab list will update via useTabs() subscription
    closeTab(tabId)
  }

  // Handle messages from background script (global shortcuts)
  const messageHandlers = useMemo(() => ({ onAdvanceSelection: navigate }), [navigate])
  usePopupMessages(messageHandlers)

  const [showGlobalScopeHint, setShowGlobalScopeHint] = useState(false)

  // When the background reopens the popup in the middle of a switch, keep the selection
  useEffect(() => {
    browser.runtime
      .sendMessage({ type: "POPUP_OPENED" })
      .then(async (response) => {
        if (typeof response?.startIndex === "number") setSelectedIndex(response.startIndex)
        if (response?.openedFromElsewhere) {
          const { hideGlobalScopeHint } = await browser.storage.local.get("hideGlobalScopeHint")
          setShowGlobalScopeHint(!hideGlobalScopeHint)
        }
      })
      .catch(() => {})
  }, [setSelectedIndex])

  // Chrome opens an unpinned extension's popup only after animating its icon out of the
  // Extensions menu, so suggest pinning it until it's pinned or the hint is dismissed
  const pinned = useToolbarPinned()
  const [pinHintDismissed, setPinHintDismissed] = useState(true)
  useEffect(() => {
    browser.storage.local
      .get("hidePinHint")
      .then(({ hidePinHint }) => setPinHintDismissed(Boolean(hidePinHint)))
      .catch(() => {})
  }, [])
  const showPinHint = pinned === false && !pinHintDismissed && !showGlobalScopeHint

  // Focus management: ensure popup has focus. The toolbar popup closes by itself when it loses
  // focus; the fallback popup window (mode=window) has to close itself.
  useEffect(() => {
    window.focus()
    if (new URLSearchParams(location.search).get("mode") !== "window") return

    const handleBlur = () => window.close()
    window.addEventListener("blur", handleBlur)
    return () => {
      window.removeEventListener("blur", handleBlur)
    }
  }, [])

  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    refreshTabs()
      .then(() => {
        // Give a brief visual feedback before clearing state
        setTimeout(() => setIsRefreshing(false), 500)
      })
      .catch(() => {
        setIsRefreshing(false)
      })
  }

  return (
    <div className="w-[360px] h-[480px] bg-background">
      <SwitcherContainer variant="fill" onClose={() => window.close()}>
        {showGlobalScopeHint && (
          <GlobalScopeHint
            onFix={openShortcutsPage}
            onDismiss={() => {
              setShowGlobalScopeHint(false)
              browser.storage.local.set({ hideGlobalScopeHint: true })
            }}
          />
        )}
        {showPinHint && (
          <PinHint
            browserType={browserType}
            onDismiss={() => {
              setPinHintDismissed(true)
              browser.storage.local.set({ hidePinHint: true })
            }}
          />
        )}
        <TabSwitcher
          tabs={tabs}
          selectedIndex={selectedIndex}
          onSelectTab={handleSelectTab}
          onClose={() => window.close()}
          onNavigate={navigate}
          onCloseTab={handleCloseTab}
          keyboard={keyboard}
          onOpenSettings={openSettings}
          onOpenTabManagement={openTabManagement}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          isLoading={isLoading}
          onVisibleTabsChange={onVisibleTabsChange}
        />
      </SwitcherContainer>
    </div>
  )
}

/**
 * Shown when the shortcut was pressed outside this profile's windows, which only happens when
 * its scope is "Global". Chrome gives a global shortcut to one profile, so in every other
 * profile Alt+Tab opens this profile's tabs.
 */
function GlobalScopeHint({ onFix, onDismiss }: { onFix: () => void; onDismiss: () => void }) {
  return (
    <div className="m-2 mb-0 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
      <p className="text-foreground">
        This shortcut is set to "Global", so it always opens this profile's tabs, even from another Chrome profile. Set
        it to "In Chrome" to give each profile its own.
      </p>
      <div className="flex gap-2">
        <button onClick={onFix} className="px-2 py-1 rounded bg-primary text-primary-foreground">
          Change shortcut
        </button>
        <button onClick={onDismiss} className="px-2 py-1 rounded hover:bg-muted text-muted-foreground">
          Don't show again
        </button>
      </div>
    </div>
  )
}

/** Shown while the extension's icon isn't pinned to the toolbar, which slows the popup down */
function PinHint({ browserType, onDismiss }: { browserType: string; onDismiss: () => void }) {
  const browserName = browserType === "edge" ? "Edge" : "Chrome"
  return (
    <div className="m-2 mb-0 p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs space-y-2">
      <p className="text-foreground">
        Pin this extension to make the switcher open instantly. While it's unpinned, {browserName} plays an animation
        before it opens. {pinInstructions(browserType)}
      </p>
      <button onClick={onDismiss} className="px-2 py-1 rounded hover:bg-muted text-muted-foreground">
        Don't show again
      </button>
    </div>
  )
}

function App() {
  return (
    <ExtensionPlatformProvider>
      <PopupContent />
    </ExtensionPlatformProvider>
  )
}

export default App
