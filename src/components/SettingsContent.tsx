import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { KeyButton } from "./KeyButton";

export interface KeyboardShortcuts {
  modifier: string;
  activateForward: string;
  activateBackward: string;
  search: string;
  closeTab: string;
}

interface SettingsContentProps {
  shortcuts: KeyboardShortcuts;
  onShortcutsChange: (shortcuts: KeyboardShortcuts) => void;
  onSave?: () => void;
  onCancel?: () => void;
  showActions?: boolean;
}

export const SettingsContent = ({ 
  shortcuts, 
  onShortcutsChange, 
  onSave,
  onCancel,
  showActions = true 
}: SettingsContentProps) => {
  const [capturingKey, setCapturingKey] = useState<string | null>(null);

  const handleReset = () => {
    const defaultShortcuts = {
      modifier: "Alt",
      activateForward: "Tab",
      activateBackward: "`",
      search: "F",
      closeTab: "W",
    };
    onShortcutsChange(defaultShortcuts);
  };

  return (
    <div className="space-y-5 py-2">
      {/* Keyboard Shortcuts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Keyboard Shortcuts</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Click a key to customize it</p>
          </div>
          <ThemeToggle />
        </div>

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
              isCapturing={capturingKey === 'modifier'}
              onCaptureStart={() => setCapturingKey('modifier')}
              onCaptureEnd={() => setCapturingKey(null)}
            />
          </div>
        </div>

        {/* Navigation Shortcuts Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Next */}
          <div className="space-y-2">
            <div>
              <Label className="text-sm font-medium">Next</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Switch to more recently used tab
              </p>
            </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1 relative min-h-[60px] justify-start">
                <div className="w-11 h-11 rounded-md bg-muted font-mono text-sm flex items-center justify-center border-2 border-transparent">
                  {shortcuts.modifier}
                </div>
              </div>
              <span className="text-muted-foreground text-sm h-11 flex items-center">+</span>
            </div>
            <KeyButton
              value={shortcuts.activateForward}
              onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, activateForward: key })}
              isCapturing={capturingKey === 'forward'}
              onCaptureStart={() => setCapturingKey('forward')}
              onCaptureEnd={() => setCapturingKey(null)}
            />
          </div>
          </div>

          {/* Previous */}
          <div className="space-y-2">
            <div>
              <Label className="text-sm font-medium">Previous</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Switch to less recently used tab
              </p>
            </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1 relative min-h-[60px] justify-start">
                <div className="w-11 h-11 rounded-md bg-muted font-mono text-sm flex items-center justify-center border-2 border-transparent">
                  {shortcuts.modifier}
                </div>
              </div>
              <span className="text-muted-foreground text-sm h-11 flex items-center">+</span>
            </div>
            <KeyButton
              value={shortcuts.activateBackward}
              onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, activateBackward: key })}
              isCapturing={capturingKey === 'backward'}
              onCaptureStart={() => setCapturingKey('backward')}
              onCaptureEnd={() => setCapturingKey(null)}
            />
          </div>
          </div>
        </div>

        {/* Actions Shortcuts Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <div>
              <Label className="text-sm font-medium">Search</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Open tab search
              </p>
            </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1 relative min-h-[60px] justify-start">
                <div className="w-11 h-11 rounded-md bg-muted font-mono text-sm flex items-center justify-center border-2 border-transparent">
                  {shortcuts.modifier}
                </div>
              </div>
              <span className="text-muted-foreground text-sm h-11 flex items-center">+</span>
            </div>
            <KeyButton
              value={shortcuts.search}
              onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, search: key })}
              isCapturing={capturingKey === 'search'}
              onCaptureStart={() => setCapturingKey('search')}
              onCaptureEnd={() => setCapturingKey(null)}
            />
          </div>
          </div>

          {/* Close */}
          <div className="space-y-2">
            <div>
              <Label className="text-sm font-medium">Close</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Close current tab
              </p>
            </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1 relative min-h-[60px] justify-start">
                <div className="w-11 h-11 rounded-md bg-muted font-mono text-sm flex items-center justify-center border-2 border-transparent">
                  {shortcuts.modifier}
                </div>
              </div>
              <span className="text-muted-foreground text-sm h-11 flex items-center">+</span>
            </div>
            <KeyButton
              value={shortcuts.closeTab}
              onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, closeTab: key })}
              isCapturing={capturingKey === 'close'}
              onCaptureStart={() => setCapturingKey('close')}
              onCaptureEnd={() => setCapturingKey(null)}
            />
          </div>
          </div>
        </div>
      </div>

      {showActions && (
        <div className="flex justify-between items-center gap-2 pt-4 border-t mt-4">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            {onCancel && (
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {onSave && (
              <Button size="sm" onClick={onSave}>
                Save Changes
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
