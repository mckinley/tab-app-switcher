import { cn } from "../lib/utils";

// Fallback favicon: a grey dot with a star in the center (8x8px)
const FALLBACK_FAVICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="%23999"/><path d="M4 2.5 L4.4 3.6 L5.6 3.6 L4.6 4.3 L5 5.5 L4 4.7 L3 5.5 L3.4 4.3 L2.4 3.6 L3.6 3.6 Z" fill="%23fff"/></svg>';

interface TabFaviconProps {
  src: string;
  alt?: string;
  className?: string;
}

export const TabFavicon = ({ src, alt = "", className }: TabFaviconProps) => {
  return (
    <img
      src={src}
      alt={alt}
      className={cn("transition-opacity duration-300", className)}
      onError={(e) => {
        e.currentTarget.src = FALLBACK_FAVICON;
        e.currentTarget.classList.add('favicon-fallback');
      }}
    />
  );
};

