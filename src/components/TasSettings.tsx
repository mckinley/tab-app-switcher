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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "next-themes";
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
  const { theme, setTheme } = useTheme();
  const [localShortcuts, setLocalShortcuts] = useState(shortcuts);
  const [open, setOpen] = useState(false);

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>TAS Settings</DialogTitle>
          <DialogDescription>
            Customize keyboard shortcuts and appearance preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Selection */}
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System Default</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose your preferred color scheme
            </p>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-medium mb-1">Keyboard Shortcuts</h3>
              <p className="text-xs text-muted-foreground">Click a key to customize it</p>
            </div>

            {/* Modifier Key */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Modifier Key</Label>
              <div className="flex gap-3">
                <KeyButton
                  value={localShortcuts.modifier}
                  onKeyCapture={(key) => setLocalShortcuts({ ...localShortcuts, modifier: key })}
                  label="Modifier"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Main modifier key for all shortcuts (e.g., Alt, Cmd, Ctrl)
              </p>
            </div>

            {/* Navigation Shortcuts */}
            <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
              <Label className="text-sm font-medium">TAS Navigation</Label>
              <div className="flex gap-3">
                <KeyButton
                  value={localShortcuts.activateForward}
                  onKeyCapture={(key) => setLocalShortcuts({ ...localShortcuts, activateForward: key })}
                  label="Forward"
                />
                <KeyButton
                  value={localShortcuts.activateBackward}
                  onKeyCapture={(key) => setLocalShortcuts({ ...localShortcuts, activateBackward: key })}
                  label="Backward"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {localShortcuts.modifier}+{localShortcuts.activateForward} opens TAS and moves forward in MRU list. {localShortcuts.modifier}+{localShortcuts.activateBackward} moves backward.
              </p>
            </div>

            {/* Action Shortcuts */}
            <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
              <Label className="text-sm font-medium">Actions</Label>
              <div className="flex gap-3 flex-wrap">
                <KeyButton
                  value={localShortcuts.search}
                  onKeyCapture={(key) => setLocalShortcuts({ ...localShortcuts, search: key })}
                  label="Search"
                />
                <KeyButton
                  value={localShortcuts.closeTab}
                  onKeyCapture={(key) => setLocalShortcuts({ ...localShortcuts, closeTab: key })}
                  label="Close Tab"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Press {localShortcuts.search} to search tabs. {localShortcuts.modifier}+{localShortcuts.closeTab} to close selected tab.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-3 pt-4">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
