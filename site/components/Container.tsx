import { type ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ContainerProps {
  children: ReactNode;
  variant: 'modal' | 'full-screen' | 'panel-right';
  isVisible: boolean;
  onClose?: () => void;
  enabled?: boolean;
  className?: string;
}

/**
 * Container component for website - handles layout, positioning, backdrop, and close behavior
 * for overlay panels and dialogs.
 *
 * Variants:
 * - 'panel-right': Fixed positioned panel in top-right corner (e.g., TabSwitcher)
 * - 'full-screen': Full-screen dialog with backdrop (e.g., TabManagement)
 * - 'modal': Centered modal dialog (e.g., Settings)
 */
export const Container = ({
  children,
  variant,
  isVisible,
  onClose,
  enabled = true,
  className,
}: ContainerProps) => {
  // Handle escape key to close
  useEffect(() => {
    if (!isVisible || !enabled || !onClose) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isVisible, enabled, onClose]);

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop - click to close */}
      <div
        className={cn(
          "fixed inset-0 backdrop-blur-sm",
          variant === 'panel-right' && "z-50 bg-[hsl(var(--switcher-backdrop))]/20",
          (variant === 'full-screen' || variant === 'modal') && "z-[60] bg-background/80"
        )}
        onClick={enabled ? onClose : undefined}
      />

      {/* Container - holds both panel and close button */}
      <div
        className={cn(
          "fixed",

          // Variant-specific positioning and z-index
          variant === 'panel-right' && [
            "z-50",
            "top-4 bottom-4",
            "left-2 right-2 sm:left-auto sm:right-4",
          ],
          (variant === 'full-screen' || variant === 'modal') && "z-[61]",
          variant === 'full-screen' && [
            "inset-2",
          ],
          variant === 'modal' && [
            "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "max-h-[90vh]",
            "flex items-start gap-3",
          ],
        )}
      >
        {/* Panel Content */}
        <div
          className={cn(
            // Common styles
            "bg-[hsl(var(--switcher-bg))] rounded-xl",
            "shadow-[0_8px_32px_-8px_hsl(var(--switcher-shadow))]",
            "border border-border/50",
            "flex flex-col overflow-hidden",

            // Variant-specific sizing
            variant === 'panel-right' && [
              "w-auto sm:w-[360px]",
              "max-w-[360px]",
              "h-full",
            ],
            variant === 'full-screen' && [
              "w-full h-full",
              "relative", // For absolute positioning of close button
            ],
            variant === 'modal' && [
              "w-[90vw] max-w-2xl",
              "max-h-full",
            ],

            className
          )}
        >
          {children}

          {/* Close button for full-screen - inside panel at top right */}
          {onClose && enabled && variant === 'full-screen' && (
            <button
              onClick={onClose}
              className={cn(
                "absolute top-2 right-2",
                "w-8 h-8 rounded-full flex-shrink-0",
                "bg-zinc-900 dark:bg-zinc-950",
                "border border-zinc-800",
                "flex items-center justify-center",
                "text-white",
                "transition-colors",
                "hover:bg-zinc-800 dark:hover:bg-zinc-900",
                "z-10", // Above panel content
              )}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Close button for modal - positioned next to panel */}
        {onClose && enabled && variant === 'modal' && (
          <button
            onClick={onClose}
            className={cn(
              "w-8 h-8 rounded-full flex-shrink-0",
              "bg-zinc-900 dark:bg-zinc-950",
              "border border-zinc-800",
              "flex items-center justify-center",
              "text-white",
              "transition-colors",
              "hover:bg-zinc-800 dark:hover:bg-zinc-900",
            )}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </>
  );
};

