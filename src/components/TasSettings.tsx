import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "next-themes";

interface KeyboardShortcuts {
  openSwitcher: string;
  search: string;
  closeTab: string;
}

interface TasSettingsProps {
  shortcuts: KeyboardShortcuts;
  onShortcutsChange: (shortcuts: KeyboardShortcuts) => void;
}

export const TasSettings = ({ shortcuts, onShortcutsChange }: TasSettingsProps) => {
  const { theme, setTheme } = useTheme();
  const [localShortcuts, setLocalShortcuts] = useState(shortcuts);
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    onShortcutsChange(localShortcuts);
    setOpen(false);
  };

  const handleReset = () => {
    const defaultShortcuts = {
      openSwitcher: "Alt+`",
      search: "F",
      closeTab: "Alt+W",
    };
    setLocalShortcuts(defaultShortcuts);
    onShortcutsChange(defaultShortcuts);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Keyboard Shortcuts</h3>
            
            <div className="space-y-2">
              <Label htmlFor="shortcut-open">Open Switcher</Label>
              <Input
                id="shortcut-open"
                value={localShortcuts.openSwitcher}
                onChange={(e) => setLocalShortcuts({ ...localShortcuts, openSwitcher: e.target.value })}
                placeholder="Alt+`"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Keyboard shortcut to open the tab switcher
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortcut-search">Search Tabs</Label>
              <Input
                id="shortcut-search"
                value={localShortcuts.search}
                onChange={(e) => setLocalShortcuts({ ...localShortcuts, search: e.target.value })}
                placeholder="F"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Key to focus the search input
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortcut-close">Close Tab</Label>
              <Input
                id="shortcut-close"
                value={localShortcuts.closeTab}
                onChange={(e) => setLocalShortcuts({ ...localShortcuts, closeTab: e.target.value })}
                placeholder="Alt+W"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Keyboard shortcut to close the selected tab
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-3 pt-4">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
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
