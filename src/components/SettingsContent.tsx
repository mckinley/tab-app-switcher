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
  showActions?: boolean;
}

export const SettingsContent = ({ 
  shortcuts, 
  onShortcutsChange, 
  onSave,
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
          <Label className="text-xs sm:text-sm font-medium">Modifier Key</Label>
          <div className="flex gap-2 flex-wrap">
            <KeyButton
              value={shortcuts.modifier}
              onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, modifier: key })}
              label="Modifier"
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
          <Label className="text-xs sm:text-sm font-medium">Switch Tabs Forward</Label>
          <div className="flex gap-2 flex-wrap">
            <div className="px-2 py-1 rounded bg-muted text-xs font-mono">
              {shortcuts.modifier}
            </div>
            <span className="text-muted-foreground">+</span>
            <KeyButton
              value={shortcuts.activateForward}
              onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, activateForward: key })}
              label="Forward"
              isCapturing={capturingKey === 'forward'}
              onCaptureStart={() => setCapturingKey('forward')}
              onCaptureEnd={() => setCapturingKey(null)}
            />
          </div>
        </div>

        {/* Switch Tabs Backward */}
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm font-medium">Switch Tabs Backward</Label>
          <div className="flex gap-2 flex-wrap">
            <div className="px-2 py-1 rounded bg-muted text-xs font-mono">
              {shortcuts.modifier}
            </div>
            <span className="text-muted-foreground">+</span>
            <div className="px-2 py-1 rounded bg-muted text-xs font-mono">
              Shift
            </div>
            <span className="text-muted-foreground">+</span>
            <KeyButton
              value={shortcuts.activateBackward}
              onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, activateBackward: key })}
              label="Backward"
              isCapturing={capturingKey === 'backward'}
              onCaptureStart={() => setCapturingKey('backward')}
              onCaptureEnd={() => setCapturingKey(null)}
            />
          </div>
        </div>

        {/* Search Tabs */}
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm font-medium">Search Tabs</Label>
          <div className="flex gap-2 flex-wrap">
            <div className="px-2 py-1 rounded bg-muted text-xs font-mono">
              {shortcuts.modifier}
            </div>
            <span className="text-muted-foreground">+</span>
            <KeyButton
              value={shortcuts.search}
              onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, search: key })}
              label="Search"
              isCapturing={capturingKey === 'search'}
              onCaptureStart={() => setCapturingKey('search')}
              onCaptureEnd={() => setCapturingKey(null)}
            />
          </div>
        </div>

        {/* Close Tab */}
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm font-medium">Close Tab</Label>
          <div className="flex gap-2 flex-wrap">
            <div className="px-2 py-1 rounded bg-muted text-xs font-mono">
              {shortcuts.modifier}
            </div>
            <span className="text-muted-foreground">+</span>
            <KeyButton
              value={shortcuts.closeTab}
              onKeyCapture={(key) => onShortcutsChange({ ...shortcuts, closeTab: key })}
              label="Close"
              isCapturing={capturingKey === 'close'}
              onCaptureStart={() => setCapturingKey('close')}
              onCaptureEnd={() => setCapturingKey(null)}
            />
          </div>
        </div>
      </div>

      {showActions && (
        <div className="flex justify-between items-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset to Defaults
          </Button>
          {onSave && (
            <Button size="sm" onClick={onSave}>
              Save Changes
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
