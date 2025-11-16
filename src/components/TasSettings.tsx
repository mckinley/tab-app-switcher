import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { KeyButton } from "./KeyButton";

interface KeyboardShortcuts {
  modifier: string;
  activateForward: string;
  activateBackward: string;
  search: string;
  closeTab: string;
}

interface TasSettingsProps {
  shortcuts: KeyboardShortcuts;
  onShortcutsChange: (shortcuts: KeyboardShortcuts) => void;
  onOpenChange?: (open: boolean) => void;
}

export const TasSettings = ({ shortcuts, onShortcutsChange, onOpenChange }: TasSettingsProps) => {
  const [localShortcuts, setLocalShortcuts] = useState(shortcuts);
  const [open, setOpen] = useState(false);
  const [capturingKey, setCapturingKey] = useState<string | null>(null);

  // Sync localShortcuts when shortcuts prop changes
  useEffect(() => {
    setLocalShortcuts(shortcuts);
  }, [shortcuts]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const handleSave = () => {
    onShortcutsChange(localShortcuts);
    handleOpenChange(false);
  };

  const handleReset = () => {
    const defaultShortcuts = {
      modifier: "Alt",
      activateForward: "Tab",
      activateBackward: "`",
      search: "F",
      closeTab: "W",
    };
    setLocalShortcuts(defaultShortcuts);
    onShortcutsChange(defaultShortcuts);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent 
        className="w-[90vw] max-w-[450px] p-3 sm:p-6"
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">TAS Settings</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Customize keyboard shortcuts and appearance
          </DialogDescription>
        </DialogHeader>

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
                  value={localShortcuts.modifier}
                  onKeyCapture={(key) => setLocalShortcuts({ ...localShortcuts, modifier: key })}
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

            {/* Navigation Shortcuts */}
            <div className="space-y-1.5 p-2 sm:p-3 bg-muted rounded-lg border border-border">
              <Label className="text-xs sm:text-sm font-medium">TAS Navigation</Label>
              <div className="flex gap-2 flex-wrap">
                <KeyButton
                  value={localShortcuts.activateForward}
                  onKeyCapture={(key) => setLocalShortcuts({ ...localShortcuts, activateForward: key })}
                  label="Forward"
                  isCapturing={capturingKey === 'activateForward'}
                  onCaptureStart={() => setCapturingKey('activateForward')}
                  onCaptureEnd={() => setCapturingKey(null)}
                />
                <KeyButton
                  value={localShortcuts.activateBackward}
                  onKeyCapture={(key) => setLocalShortcuts({ ...localShortcuts, activateBackward: key })}
                  label="Backward"
                  isCapturing={capturingKey === 'activateBackward'}
                  onCaptureStart={() => setCapturingKey('activateBackward')}
                  onCaptureEnd={() => setCapturingKey(null)}
                />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                {localShortcuts.modifier}+{localShortcuts.activateForward} opens TAS and moves forward in MRU list. {localShortcuts.modifier}+{localShortcuts.activateBackward} moves backward.
              </p>
            </div>

            {/* Action Shortcuts */}
            <div className="space-y-1.5 p-2 sm:p-3 bg-muted rounded-lg border border-border">
              <Label className="text-xs sm:text-sm font-medium">Actions</Label>
              <div className="flex gap-2 flex-wrap">
                <KeyButton
                  value={localShortcuts.search}
                  onKeyCapture={(key) => setLocalShortcuts({ ...localShortcuts, search: key })}
                  label="Search"
                  isCapturing={capturingKey === 'search'}
                  onCaptureStart={() => setCapturingKey('search')}
                  onCaptureEnd={() => setCapturingKey(null)}
                />
                <KeyButton
                  value={localShortcuts.closeTab}
                  onKeyCapture={(key) => setLocalShortcuts({ ...localShortcuts, closeTab: key })}
                  label="Close Tab"
                  isCapturing={capturingKey === 'closeTab'}
                  onCaptureStart={() => setCapturingKey('closeTab')}
                  onCaptureEnd={() => setCapturingKey(null)}
                />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                Press {localShortcuts.search} to search tabs. {localShortcuts.modifier}+{localShortcuts.closeTab} to close selected tab.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-2 pt-3 border-t">
          <Button variant="outline" onClick={handleReset} className="text-xs sm:text-sm">
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => handleOpenChange(false)} className="text-xs sm:text-sm">
              Cancel
            </Button>
            <Button onClick={handleSave} className="text-xs sm:text-sm">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
