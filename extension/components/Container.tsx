import { type ReactNode, useEffect } from "react";
import { cn } from "@tas/lib/utils";

interface ContainerProps {
  children: ReactNode;
  variant: 'fill' | 'screen';
  onClose?: () => void;
  enabled?: boolean;
  className?: string;
}

/**
 * Container component for extension - handles layout and sizing for extension contexts.
 *
 * Variants:
 * - 'fill': Fills parent container (e.g., popup window)
 * - 'screen': Full screen height (e.g., tabs page, options page)
 */
export const Container = ({
  children,
  variant,
  onClose,
  enabled = true,
  className,
}: ContainerProps) => {
  // Handle escape key to close
  useEffect(() => {
    if (!enabled || !onClose) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [enabled, onClose]);

  return (
    <div
      className={cn(
        // Common styles
        "bg-[hsl(var(--switcher-bg))] rounded-xl",
        "shadow-[0_8px_32px_-8px_hsl(var(--switcher-shadow))]",
        "border border-border/50",
        "flex flex-col overflow-hidden",

        // Variant-specific sizing
        variant === 'fill' && "w-full h-full",
        variant === 'screen' && "h-screen bg-background",

        className
      )}
    >
      {children}
    </div>
  );
};

