import { useState } from "react"
import { Label } from "@tab-app-switcher/ui/components/label"
import { Button } from "@tab-app-switcher/ui/components/button"
import { Separator } from "@tab-app-switcher/ui/components/separator"
import { KeyButton } from "../KeyButton"
import { KeyboardSettings as KeyboardSettingsType, DEFAULT_KEYBOARD_SETTINGS } from "../../types/tabs"

interface KeyboardSettingsProps {
  keyboard: KeyboardSettingsType
  onKeyboardChange: (keyboard: KeyboardSettingsType) => void
}

export const KeyboardSettings = ({ keyboard, onKeyboardChange }: KeyboardSettingsProps) => {
  const [capturingKey, setCapturingKey] = useState<string | null>(null)

  const handleReset = () => {
    onKeyboardChange(DEFAULT_KEYBOARD_SETTINGS)
  }

  return (
    <div className="space-y-4">
      {/* Shortcuts Panel */}
      <div className="space-y-4">
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
              value={keyboard.modifier}
              onKeyCapture={(key) => onKeyboardChange({ ...keyboard, modifier: key })}
              isCapturing={capturingKey === "modifier"}
              onCaptureStart={() => setCapturingKey("modifier")}
              onCaptureEnd={() => setCapturingKey(null)}
            />
          </div>
        </div>

        <Separator />

        {/* Navigation Keys Grid */}
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
                  {keyboard.modifier}
                </div>
              </div>
              <div className="h-11 flex items-center">
                <span className="text-muted-foreground text-sm">+</span>
              </div>
              <KeyButton
                value={keyboard.activateForward}
                onKeyCapture={(key) => onKeyboardChange({ ...keyboard, activateForward: key })}
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
                  {keyboard.modifier}
                </div>
              </div>
              <div className="h-11 flex items-center">
                <span className="text-muted-foreground text-sm">+</span>
              </div>
              <KeyButton
                value={keyboard.activateBackward}
                onKeyCapture={(key) => onKeyboardChange({ ...keyboard, activateBackward: key })}
                isCapturing={capturingKey === "backward"}
                onCaptureStart={() => setCapturingKey("backward")}
                onCaptureEnd={() => setCapturingKey(null)}
              />
            </div>
          </div>
        </div>

        {/* Action Keys Grid */}
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
                  {keyboard.modifier}
                </div>
              </div>
              <div className="h-11 flex items-center">
                <span className="text-muted-foreground text-sm">+</span>
              </div>
              <KeyButton
                value={keyboard.search}
                onKeyCapture={(key) => onKeyboardChange({ ...keyboard, search: key })}
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
                  {keyboard.modifier}
                </div>
              </div>
              <div className="h-11 flex items-center">
                <span className="text-muted-foreground text-sm">+</span>
              </div>
              <KeyButton
                value={keyboard.closeTab}
                onKeyCapture={(key) => onKeyboardChange({ ...keyboard, closeTab: key })}
                isCapturing={capturingKey === "close"}
                onCaptureStart={() => setCapturingKey("close")}
                onCaptureEnd={() => setCapturingKey(null)}
              />
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
