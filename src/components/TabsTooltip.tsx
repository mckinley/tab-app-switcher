import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TabsTooltipProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export const TabsTooltip = ({ isVisible, onDismiss }: TabsTooltipProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Delay showing to allow page to load
    const timer = setTimeout(() => {
      setShow(isVisible);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isVisible]);

  if (!show) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="relative bg-primary text-primary-foreground rounded-lg px-6 py-4 shadow-xl max-w-md animate-bounce-gentle">
        {/* Arrow pointing up */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary rotate-45" />
        
        <div className="relative flex items-start gap-3">
          <p className="text-sm font-medium leading-relaxed">
            Click some tabs above, then press <kbd className="px-2 py-1 bg-primary-foreground/20 rounded text-xs font-mono mx-1">Alt</kbd> + <kbd className="px-2 py-1 bg-primary-foreground/20 rounded text-xs font-mono mx-1">Tab</kbd> to see the MRU ordered tabs!
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-primary-foreground/20 shrink-0"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
