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
    <div className="space-y-4 py-2">
      {/* Keyboard Shortcuts Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium">Keyboard Shortcuts</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Click a key to customize it</p>
          </div>
          <div className="flex-shrink-0">
            <ThemeToggle />
          </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Next */}
          <div className="space-y-2">
            <div>
              <Label className="text-sm font-medium">Next</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Switch to more recently used tab
              </p>
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
              isCapturing={capturingKey === 'backward'}
              onCaptureStart={() => setCapturingKey('backward')}
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
              <p className="text-xs text-muted-foreground mt-0.5">
                Open tab search
              </p>
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
              isCapturing={capturingKey === 'close'}
              onCaptureStart={() => setCapturingKey('close')}
              onCaptureEnd={() => setCapturingKey(null)}
            />
          </div>
          </div>
        </div>
      </div>

      {showActions && (
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-4 border-t mt-4">
          <Button variant="outline" size="sm" onClick={handleReset} className="w-full sm:w-auto">
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            {onCancel && (
              <Button variant="outline" size="sm" onClick={onCancel} className="flex-1 sm:flex-none">
                Cancel
              </Button>
            )}
            {onSave && (
              <Button size="sm" onClick={onSave} className="flex-1 sm:flex-none">
                Save Changes
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
