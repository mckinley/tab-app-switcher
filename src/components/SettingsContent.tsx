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
    <div className="space-y-3 py-2">
      {/* Theme Selection */}
      <div className="flex items-center justify-between gap-4">
        <Label className="text-sm font-medium">Theme</Label>
        <ThemeToggle />
      </div>

      {/* Keyboard Shortcuts */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium mb-1">Keyboard Shortcuts</h3>
          <p className="text-xs text-muted-foreground">Click a key to customize it</p>
        </div>

        {/* Modifier Key */}
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm font-medium">Modifier</Label>
          <div className="flex gap-2 items-center">
            <KeyButton
              value={shortcuts.modifier}
              onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, modifier: key })}
              isCapturing={capturingKey === 'modifier'}
              onCaptureStart={() => setCapturingKey('modifier')}
              onCaptureEnd={() => setCapturingKey(null)}
            />
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Main modifier key for all shortcuts (e.g., Alt, Cmd, Ctrl)
          </p>
        </div>

        {/* Switch Tabs Forward */}
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm font-medium">Next</Label>
          <div className="flex gap-2 items-center">
            <div className="w-12 h-12 rounded bg-muted text-xs font-mono flex items-center justify-center">
              {shortcuts.modifier}
            </div>
            <span className="text-muted-foreground text-sm">+</span>
            <KeyButton
              value={shortcuts.activateForward}
              onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, activateForward: key })}
              isCapturing={capturingKey === 'forward'}
              onCaptureStart={() => setCapturingKey('forward')}
              onCaptureEnd={() => setCapturingKey(null)}
            />
          </div>
        </div>

        {/* Switch Tabs Backward */}
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm font-medium">Previous</Label>
          <div className="flex gap-2 items-center">
            <div className="w-12 h-12 rounded bg-muted text-xs font-mono flex items-center justify-center">
              {shortcuts.modifier}
            </div>
            <span className="text-muted-foreground text-sm">+</span>
            <KeyButton
              value={shortcuts.activateBackward}
              onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, activateBackward: key })}
              isCapturing={capturingKey === 'backward'}
              onCaptureStart={() => setCapturingKey('backward')}
              onCaptureEnd={() => setCapturingKey(null)}
            />
          </div>
        </div>

        {/* Search Tabs */}
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm font-medium">Search</Label>
          <div className="flex gap-2 items-center">
            <div className="w-12 h-12 rounded bg-muted text-xs font-mono flex items-center justify-center">
              {shortcuts.modifier}
            </div>
            <span className="text-muted-foreground text-sm">+</span>
            <KeyButton
              value={shortcuts.search}
              onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, search: key })}
              isCapturing={capturingKey === 'search'}
              onCaptureStart={() => setCapturingKey('search')}
              onCaptureEnd={() => setCapturingKey(null)}
            />
          </div>
        </div>

        {/* Close Tab */}
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm font-medium">Close</Label>
          <div className="flex gap-2 items-center">
            <div className="w-12 h-12 rounded bg-muted text-xs font-mono flex items-center justify-center">
              {shortcuts.modifier}
            </div>
            <span className="text-muted-foreground text-sm">+</span>
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
