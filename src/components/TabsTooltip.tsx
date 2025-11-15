import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TabsTooltipProps {
  isVisible: boolean;
  onDismiss: () => void;
  hasBeenUsed?: boolean;
}

export const TabsTooltip = ({ isVisible, onDismiss, hasBeenUsed = false }: TabsTooltipProps) => {
  const [show, setShow] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Delay showing to allow page to load
    if (isVisible) {
      // Longer delay if TAS has been used before (3 seconds), shorter for first appearance (2 seconds)
      const delay = hasBeenUsed ? 3000 : 2000;
      const timer = setTimeout(() => {
        setShow(true);
        setFadingOut(false);
      }, delay);
      return () => clearTimeout(timer);
    } else if (show) {
      // Trigger fade out when isVisible becomes false
      setFadingOut(true);
      const timer = setTimeout(() => {
        setShow(false);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isVisible, show, hasBeenUsed]);

  const handleDismiss = () => {
    setFadingOut(true);
    setTimeout(() => {
      setShow(false);
      onDismiss();
    }, 300); // Match animation duration
  };

  if (!show) return null;

  return (
    <div className={`absolute top-2 left-1/2 -translate-x-1/2 z-50 w-[85vw] sm:w-auto ${fadingOut ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div className="relative bg-primary text-primary-foreground rounded-lg shadow-xl max-w-md animate-bounce-gentle">
        {/* Arrow pointing up */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary rotate-45" />
        
        <div className="relative flex items-start">
          <p className="text-sm font-medium leading-relaxed px-6 py-4 pr-4">
            Click some tabs above, then press <kbd className="px-2 py-1 bg-primary-foreground/20 rounded text-xs font-mono mx-1">Alt</kbd> + <kbd className="px-2 py-1 bg-primary-foreground/20 rounded text-xs font-mono mx-1">Tab</kbd> to see the MRU ordered tabs!
          </p>
          
          {/* Vertical divider */}
          <div className="w-px bg-primary-foreground/20 self-stretch my-3" />
          
          <div className="flex items-center px-3 py-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-primary-foreground/20 shrink-0"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
