import { ReactNode, useEffect, useState } from "react";

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

  return (
    <div 
      className={`relative ${className}`}
    >
      {/* Red channel - glitchy movement */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          color: '#ff0000',
          filter: 'saturate(3)',
          mixBlendMode: 'screen',
          opacity: isAnimating ? 1 : 0,
          animation: isAnimating ? `glitch-red ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` : 'none',
          animationFillMode: 'both'
        }}
      >
        <div style={{ color: '#ff0000' }}>
          {children}
        </div>
      </div>

      {/* Green channel - glitchy movement */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          color: '#00ff00',
          filter: 'saturate(3)',
          mixBlendMode: 'screen',
          opacity: isAnimating ? 1 : 0,
          animation: isAnimating ? `glitch-green ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` : 'none',
          animationFillMode: 'both'
        }}
      >
        <div style={{ color: '#00ff00' }}>
          {children}
        </div>
      </div>

      {/* Blue channel - glitchy movement */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          color: '#0000ff',
          filter: 'saturate(3)',
          mixBlendMode: 'screen',
          opacity: isAnimating ? 1 : 0,
          animation: isAnimating ? `glitch-blue ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` : 'none',
          animationFillMode: 'both'
        }}
      >
        <div style={{ color: '#0000ff' }}>
          {children}
        </div>
      </div>

      {/* Main content with optional fade */}
      <div 
        className="relative"
        style={{
          opacity: fade ? 1 : 1,
          animation: fade ? 'fade-in 800ms ease-out' : 'none'
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
            transform: translate(12px, -8px);
            opacity: 0.9;
          }
          20% {
            transform: translate(-10px, 6px);
            opacity: 0.95;
          }
          40% {
            transform: translate(15px, -4px);
            opacity: 0.9;
          }
          60% {
            transform: translate(-8px, 10px);
            opacity: 0.85;
          }
          80% {
            transform: translate(5px, -6px);
            opacity: 0.7;
          }
          100% {
            transform: translate(0, 0);
            opacity: 0;
          }
        }

        @keyframes glitch-green {
          0% {
            transform: translate(-15px, 10px);
            opacity: 0.9;
          }
          15% {
            transform: translate(12px, -12px);
            opacity: 0.95;
          }
          35% {
            transform: translate(-8px, 5px);
            opacity: 0.9;
          }
          50% {
            transform: translate(14px, -7px);
            opacity: 0.85;
          }
          70% {
            transform: translate(-6px, 9px);
            opacity: 0.7;
          }
          90% {
            transform: translate(3px, -4px);
            opacity: 0.5;
          }
          100% {
            transform: translate(0, 0);
            opacity: 0;
          }
        }

        @keyframes glitch-blue {
          0% {
            transform: translate(8px, 14px);
            opacity: 0.9;
          }
          18% {
            transform: translate(-14px, -9px);
            opacity: 0.95;
          }
          38% {
            transform: translate(10px, 7px);
            opacity: 0.9;
          }
          55% {
            transform: translate(-12px, -11px);
            opacity: 0.85;
          }
          72% {
            transform: translate(7px, 6px);
            opacity: 0.7;
          }
          88% {
            transform: translate(-4px, -5px);
            opacity: 0.5;
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
