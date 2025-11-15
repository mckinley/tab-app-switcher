import { ReactNode, useEffect, useState, cloneElement, isValidElement } from "react";

interface RGBSplitGlitchProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  initialDelay?: number;
  fade?: boolean;
  randomRepeat?: boolean;
}

export const RGBSplitGlitch = ({ 
  children, 
  className = "",
  duration = 800,
  initialDelay = 2000,
  fade = false,
  randomRepeat = false
}: RGBSplitGlitchProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [triggerCount, setTriggerCount] = useState(0);

  useEffect(() => {
    // Initial delay before first animation
    const initialTimer = setTimeout(() => {
      setIsAnimating(true);
      setTriggerCount(prev => prev + 1);
    }, initialDelay);

    return () => clearTimeout(initialTimer);
  }, [initialDelay]);

  useEffect(() => {
    if (!isAnimating) return;

    // End current animation
    const endTimer = setTimeout(() => {
      setIsAnimating(false);
    }, duration);

    return () => clearTimeout(endTimer);
  }, [isAnimating, duration, triggerCount]);

  useEffect(() => {
    if (!randomRepeat || triggerCount === 0) return;

    // Schedule next random animation
    const randomDelay = Math.random() * 8000 + 3000; // Between 3-11 seconds
    const nextTimer = setTimeout(() => {
      setIsAnimating(true);
      setTriggerCount(prev => prev + 1);
    }, randomDelay);

    return () => clearTimeout(nextTimer);
  }, [randomRepeat, triggerCount, isAnimating]);

  // Clone children and apply color filters for images
  const applyColorFilter = (element: ReactNode, filterColor: string) => {
    if (isValidElement(element) && element.type === 'img') {
      return cloneElement(element as React.ReactElement, {
        style: {
          ...((element as React.ReactElement).props.style || {}),
          filter: filterColor === 'red' 
            ? 'brightness(1) sepia(1) saturate(10000%) hue-rotate(0deg)'
            : filterColor === 'green'
            ? 'brightness(1) sepia(1) saturate(10000%) hue-rotate(80deg)'
            : 'brightness(1) sepia(1) saturate(10000%) hue-rotate(180deg)'
        }
      });
    }
    return element;
  };

  return (
    <div 
      className={`relative ${className}`}
    >
      {/* Red channel - glitchy movement */}
      <div 
        className="absolute inset-0 pointer-events-none [&_*]:!text-[#ff0000]"
        style={{
          mixBlendMode: 'screen',
          opacity: isAnimating ? 0.8 : 0,
          animation: isAnimating ? `glitch-red ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` : 'none',
          animationFillMode: 'both'
        }}
      >
        {applyColorFilter(children, 'red')}
      </div>

      {/* Green channel - glitchy movement */}
      <div 
        className="absolute inset-0 pointer-events-none [&_*]:!text-[#00ff00]"
        style={{
          mixBlendMode: 'screen',
          opacity: isAnimating ? 0.8 : 0,
          animation: isAnimating ? `glitch-green ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` : 'none',
          animationFillMode: 'both'
        }}
      >
        {applyColorFilter(children, 'green')}
      </div>

      {/* Blue channel - glitchy movement */}
      <div 
        className="absolute inset-0 pointer-events-none [&_*]:!text-[#0000ff]"
        style={{
          mixBlendMode: 'screen',
          opacity: isAnimating ? 0.8 : 0,
          animation: isAnimating ? `glitch-blue ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` : 'none',
          animationFillMode: 'both'
        }}
      >
        {applyColorFilter(children, 'blue')}
      </div>

      {/* Main content with optional fade */}
      <div 
        className="relative"
        style={{
          opacity: isAnimating ? 0.3 : 1,
          animation: fade ? 'fade-in 800ms ease-out' : 'none',
          transition: 'opacity 200ms ease-out'
        }}
      >
        {children}
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            filter: blur(4px);
          }
          to {
            opacity: 1;
            filter: blur(0);
          }
        }

        @keyframes glitch-red {
          0% {
            transform: translate(20px, -15px);
            opacity: 0.8;
          }
          20% {
            transform: translate(-18px, 12px);
            opacity: 0.9;
          }
          40% {
            transform: translate(25px, -10px);
            opacity: 0.85;
          }
          60% {
            transform: translate(-15px, 18px);
            opacity: 0.8;
          }
          80% {
            transform: translate(10px, -12px);
            opacity: 0.6;
          }
          100% {
            transform: translate(0, 0);
            opacity: 0;
          }
        }

        @keyframes glitch-green {
          0% {
            transform: translate(-22px, 18px);
            opacity: 0.8;
          }
          15% {
            transform: translate(20px, -20px);
            opacity: 0.9;
          }
          35% {
            transform: translate(-16px, 14px);
            opacity: 0.85;
          }
          50% {
            transform: translate(24px, -16px);
            opacity: 0.8;
          }
          70% {
            transform: translate(-12px, 16px);
            opacity: 0.6;
          }
          90% {
            transform: translate(8px, -10px);
            opacity: 0.4;
          }
          100% {
            transform: translate(0, 0);
            opacity: 0;
          }
        }

        @keyframes glitch-blue {
          0% {
            transform: translate(16px, 22px);
            opacity: 0.8;
          }
          18% {
            transform: translate(-24px, -18px);
            opacity: 0.9;
          }
          38% {
            transform: translate(18px, 16px);
            opacity: 0.85;
          }
          55% {
            transform: translate(-20px, -20px);
            opacity: 0.8;
          }
          72% {
            transform: translate(14px, 14px);
            opacity: 0.6;
          }
          88% {
            transform: translate(-10px, -12px);
            opacity: 0.4;
          }
          100% {
            transform: translate(0, 0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
