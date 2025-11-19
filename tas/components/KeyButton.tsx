import { useState, useEffect } from "react";
import { cn } from "../lib/utils";

interface KeyButtonProps {
  value: string;
  onKeyCapture: (key: string) => void;
  label?: string;
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

  // Reset local capturing when another key takes over
  useEffect(() => {
    if (externalIsCapturing === false && localCapturing) {
      setLocalCapturing(false);
    }
  }, [externalIsCapturing, localCapturing]);

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
        e.stopPropagation();
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
    <div className="flex flex-col items-center gap-1 relative min-h-[60px]">
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "w-11 h-11 rounded-md font-medium transition-all",
          "border-2 shadow-sm flex items-center justify-center",
          isCapturing
            ? "border-primary bg-primary/10 text-primary animate-pulse"
            : disabled
            ? "border-border/30 bg-background/30 text-muted-foreground/50 cursor-not-allowed"
            : "border-border/50 bg-background text-foreground hover:border-primary/50 hover:bg-background/80 cursor-pointer",
          "font-mono text-sm"
        )}
      >
        {isCapturing ? (
          <span className="text-[9px] leading-tight text-center">Press<br />key</span>
        ) : (
          value
        )}
      </button>
      {isCapturing && (
        <span className="text-[9px] text-muted-foreground absolute top-[52px] whitespace-nowrap">Press Esc to cancel</span>
      )}
    </div>
  );
};
