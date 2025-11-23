import { useState } from "react"
import { Label } from "./ui/label"
import { Button } from "./ui/button"
import { KeyButton } from "./KeyButton"
import { KeyboardShortcuts, DEFAULT_SHORTCUTS } from "../types/tabs"

interface SettingsProps {
  shortcuts: KeyboardShortcuts
  onShortcutsChange: (shortcuts: KeyboardShortcuts) => void
  themeToggle?: React.ReactNode
}

export const Settings = ({ shortcuts, onShortcutsChange, themeToggle }: SettingsProps) => {
  const [capturingKey, setCapturingKey] = useState<string | null>(null)

  const handleReset = () => {
    onShortcutsChange(DEFAULT_SHORTCUTS)
  }

  return (
    <div className="space-y-4 py-2">
      {/* Keyboard Shortcuts Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium">Keyboard Shortcuts</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Click a key to customize it</p>
          </div>
          {themeToggle && <div className="flex-shrink-0">{themeToggle}</div>}
        </div>

        {/* Shortcuts Panel */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-4">
          {/* Modifier Key */}
          <div className="space-y-2">
            <div>
              <Label className="text-sm font-medium">Modifier</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Main modifier key for all shortcuts (e.g., Alt, Cmd, Ctrl)
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <KeyButton
                value={shortcuts.modifier}
                onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, modifier: key })}
                isCapturing={capturingKey === "modifier"}
                onCaptureStart={() => setCapturingKey("modifier")}
                onCaptureEnd={() => setCapturingKey(null)}
              />
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-border/50" />

          {/* Navigation Shortcuts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Next */}
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">Next</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Switch to more recently used tab</p>
              </div>
              <div className="flex gap-2 items-start">
                <div className="flex flex-col items-center gap-1 relative min-h-[60px]">
                  <div className="w-11 h-11 rounded-md bg-muted font-mono text-sm flex items-center justify-center border-2 border-transparent">
                    {shortcuts.modifier}
                  </div>
                </div>
                <div className="h-11 flex items-center">
                  <span className="text-muted-foreground text-sm">+</span>
                </div>
                <KeyButton
                  value={shortcuts.activateForward}
                  onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, activateForward: key })}
                  isCapturing={capturingKey === "forward"}
                  onCaptureStart={() => setCapturingKey("forward")}
                  onCaptureEnd={() => setCapturingKey(null)}
                />
              </div>
            </div>

            {/* Previous */}
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">Previous</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Switch to less recently used tab</p>
              </div>
              <div className="flex gap-2 items-start">
                <div className="flex flex-col items-center gap-1 relative min-h-[60px]">
                  <div className="w-11 h-11 rounded-md bg-muted font-mono text-sm flex items-center justify-center border-2 border-transparent">
                    {shortcuts.modifier}
                  </div>
                </div>
                <div className="h-11 flex items-center">
                  <span className="text-muted-foreground text-sm">+</span>
                </div>
                <KeyButton
                  value={shortcuts.activateBackward}
                  onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, activateBackward: key })}
                  isCapturing={capturingKey === "backward"}
                  onCaptureStart={() => setCapturingKey("backward")}
                  onCaptureEnd={() => setCapturingKey(null)}
                />
              </div>
            </div>
          </div>

          {/* Actions Shortcuts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">Search</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Open tab search</p>
              </div>
              <div className="flex gap-2 items-start">
                <div className="flex flex-col items-center gap-1 relative min-h-[60px]">
                  <div className="w-11 h-11 rounded-md bg-muted font-mono text-sm flex items-center justify-center border-2 border-transparent">
                    {shortcuts.modifier}
                  </div>
                </div>
                <div className="h-11 flex items-center">
                  <span className="text-muted-foreground text-sm">+</span>
                </div>
                <KeyButton
                  value={shortcuts.search}
                  onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, search: key })}
                  isCapturing={capturingKey === "search"}
                  onCaptureStart={() => setCapturingKey("search")}
                  onCaptureEnd={() => setCapturingKey(null)}
                />
              </div>
            </div>

            {/* Close */}
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">Close</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Close current tab</p>
              </div>
              <div className="flex gap-2 items-start">
                <div className="flex flex-col items-center gap-1 relative min-h-[60px]">
                  <div className="w-11 h-11 rounded-md bg-muted font-mono text-sm flex items-center justify-center border-2 border-transparent">
                    {shortcuts.modifier}
                  </div>
                </div>
                <div className="h-11 flex items-center">
                  <span className="text-muted-foreground text-sm">+</span>
                </div>
                <KeyButton
                  value={shortcuts.closeTab}
                  onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, closeTab: key })}
                  isCapturing={capturingKey === "close"}
                  onCaptureStart={() => setCapturingKey("close")}
                  onCaptureEnd={() => setCapturingKey(null)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-start pt-4 border-t mt-4">
        <Button variant="outline" size="sm" onClick={handleReset}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  )
}
