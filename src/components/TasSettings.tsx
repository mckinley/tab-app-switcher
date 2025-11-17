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
import { SettingsContent, KeyboardShortcuts } from "./SettingsContent";

export type { KeyboardShortcuts };

interface TasSettingsProps {
  shortcuts: KeyboardShortcuts;
  onShortcutsChange: (shortcuts: KeyboardShortcuts) => void;
  onOpenChange?: (open: boolean) => void;
}

export const TasSettings = ({ shortcuts, onShortcutsChange, onOpenChange }: TasSettingsProps) => {
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

  const handleCancel = () => {
    setLocalShortcuts(shortcuts);
    handleOpenChange(false);
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
        className="w-[95vw] max-w-[420px] p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
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

        <SettingsContent
          shortcuts={localShortcuts}
          onShortcutsChange={setLocalShortcuts}
          onSave={handleSave}
          onCancel={handleCancel}
          showActions={true}
        />
      </DialogContent>
    </Dialog>
  );
};
