import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface KeyButtonProps {
  value: string;
  onKeyCapture: (key: string) => void;
  label: string;
  disabled?: boolean;
  isCapturing?: boolean;
  onCaptureStart?: () => void;
  onCaptureEnd?: () => void;
}

export const KeyButton = ({ 
  value, 
  onKeyCapture, 
  label, 
  disabled = false,
  isCapturing: externalIsCapturing = false,
  onCaptureStart,
  onCaptureEnd
}: KeyButtonProps) => {
  const [localCapturing, setLocalCapturing] = useState(false);
  const isCapturing = externalIsCapturing || localCapturing;

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
        setLocalCapturing(false);
        onCaptureEnd?.();
        return;
      }
      
      // Capture single character or special key
      if (key.length === 1) {
        key = key.toUpperCase();
      }
      
      onKeyCapture(key);
      setLocalCapturing(false);
      onCaptureEnd?.();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isCapturing, onKeyCapture, onCaptureEnd]);

  const handleClick = () => {
    if (disabled) return;
    setLocalCapturing(true);
    onCaptureStart?.();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "min-w-[60px] px-3 py-2 rounded-md font-medium transition-all",
          "border-2 shadow-sm",
          isCapturing 
            ? "border-primary bg-primary/10 text-primary animate-pulse" 
            : disabled
            ? "border-border/30 bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
            : "border-border/50 bg-muted/80 text-foreground hover:border-primary/50 hover:bg-muted cursor-pointer",
          "font-mono tracking-wide"
        )}
      >
        <span className={cn("block", isCapturing ? "text-[10px] leading-tight" : "text-sm")}>
          {isCapturing ? (
            <>Press<br />key...</>
          ) : (
            value
          )}
        </span>
      </button>
      {isCapturing && (
        <span className="text-[10px] text-muted-foreground">Press Esc to cancel</span>
      )}
    </div>
  );
};
