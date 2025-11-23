import { useState, type ReactNode } from "react";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { SettingsContent } from "./SettingsContent";
import { KeyboardShortcuts } from "../types/tabs";

interface TasSettingsProps {
  shortcuts: KeyboardShortcuts;
  onShortcutsChange: (shortcuts: KeyboardShortcuts) => void;
  open?: boolean; // Controlled mode: if provided, component is controlled by parent
  onOpenChange?: (open: boolean) => void;
  themeToggle?: ReactNode;
  onOpenSettingsPage?: () => void; // Optional callback to open settings in a new tab (extension only)
}

export const TasSettings = ({ shortcuts, onShortcutsChange, open: controlledOpen, onOpenChange, themeToggle, onOpenSettingsPage }: TasSettingsProps) => {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      // Uncontrolled mode
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  // If onOpenSettingsPage is provided, use a simple button instead of Dialog
  if (onOpenSettingsPage) {
    return (
      <button
        onClick={onOpenSettingsPage}
        className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Settings"
      >
        <Settings className="h-4 w-4" />
      </button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
          shortcuts={shortcuts}
          onShortcutsChange={onShortcutsChange}
          themeToggle={themeToggle}
        />
      </DialogContent>
    </Dialog>
  );
};
