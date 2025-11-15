import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface KeyButtonProps {
  value: string;
  onKeyCapture: (key: string) => void;
  label: string;
  disabled?: boolean;
}

export const KeyButton = ({ value, onKeyCapture, label, disabled = false }: KeyButtonProps) => {
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!isCapturing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Map special keys to display names
      let key = e.key;
      if (key === "Meta") key = "Cmd";
      if (key === "Control") key = "Ctrl";
      if (key === "Shift") key = "Shift";
      if (key === "Alt") key = "Alt";
      if (key === " ") key = "Space";
      if (key === "Escape") {
        setIsCapturing(false);
        return;
      }
      
      // Capture single character or special key
      if (key.length === 1) {
        key = key.toUpperCase();
      }
      
      onKeyCapture(key);
      setIsCapturing(false);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isCapturing, onKeyCapture]);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsCapturing(true)}
        className={cn(
          "min-w-[60px] px-3 py-2 rounded-md text-sm font-medium transition-all",
          "border-2 shadow-sm",
          isCapturing 
            ? "border-primary bg-primary/10 text-primary animate-pulse" 
            : disabled
            ? "border-border/30 bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
            : "border-border/50 bg-muted/80 text-foreground hover:border-primary/50 hover:bg-muted cursor-pointer",
          "font-mono tracking-wide"
        )}
      >
        {isCapturing ? "Press key..." : value}
      </button>
      {isCapturing && (
        <span className="text-[10px] text-muted-foreground">Press Esc to cancel</span>
      )}
    </div>
  );
};
