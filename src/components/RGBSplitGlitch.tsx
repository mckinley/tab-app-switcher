import { ReactNode, useEffect, useState } from "react";

interface RGBSplitGlitchProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  fade?: boolean;
}

export const RGBSplitGlitch = ({ 
  children, 
  className = "",
  duration = 1500,
  delay = 0,
  fade = false
}: RGBSplitGlitchProps) => {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, delay + duration);
    return () => clearTimeout(timer);
  }, [delay, duration]);

  return (
    <div 
      className={`relative ${className}`}
      style={{
        animationDelay: `${delay}ms`
      }}
    >
      {/* Red channel - glitchy movement */}
      <div 
        className="absolute inset-0 pointer-events-none [&>*]:text-[#ff0000]"
        style={{
          mixBlendMode: 'screen',
          opacity: isAnimating ? 1 : 0,
          animation: isAnimating ? `glitch-red ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` : 'none',
          animationDelay: `${delay}ms`,
          animationFillMode: 'forwards'
        }}
      >
        {children}
      </div>

      {/* Green channel - glitchy movement */}
      <div 
        className="absolute inset-0 pointer-events-none [&>*]:text-[#00ff00]"
        style={{
          mixBlendMode: 'screen',
          opacity: isAnimating ? 1 : 0,
          animation: isAnimating ? `glitch-green ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` : 'none',
          animationDelay: `${delay}ms`,
          animationFillMode: 'forwards'
        }}
      >
        {children}
      </div>

      {/* Blue channel - glitchy movement */}
      <div 
        className="absolute inset-0 pointer-events-none [&>*]:text-[#0000ff]"
        style={{
          mixBlendMode: 'screen',
          opacity: isAnimating ? 1 : 0,
          animation: isAnimating ? `glitch-blue ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` : 'none',
          animationDelay: `${delay}ms`,
          animationFillMode: 'forwards'
        }}
      >
        {children}
      </div>

      {/* Main content */}
      <div 
        className="relative"
        style={{
          opacity: fade ? (isAnimating ? 0 : 1) : 1,
          filter: fade ? (isAnimating ? 'blur(4px)' : 'blur(0)') : 'none',
          transition: fade ? `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)` : 'none',
          transitionDelay: `${delay}ms`
        }}
      >
        {children}
      </div>

      <style>{`
        @keyframes glitch-red {
          0% {
            transform: translate(15px, -10px);
            opacity: 1;
          }
          15% {
            transform: translate(-12px, 8px);
          }
          30% {
            transform: translate(18px, -5px);
          }
          45% {
            transform: translate(-8px, 12px);
          }
          60% {
            transform: translate(10px, -8px);
          }
          75% {
            transform: translate(-5px, 6px);
          }
          90% {
            transform: translate(3px, -3px);
          }
          100% {
            transform: translate(0, 0);
            opacity: 0;
          }
        }

        @keyframes glitch-green {
          0% {
            transform: translate(-18px, 12px);
            opacity: 1;
          }
          12% {
            transform: translate(14px, -15px);
          }
          28% {
            transform: translate(-10px, 7px);
          }
          42% {
            transform: translate(16px, -9px);
          }
          58% {
            transform: translate(-7px, 11px);
          }
          72% {
            transform: translate(6px, -6px);
          }
          88% {
            transform: translate(-3px, 4px);
          }
          100% {
            transform: translate(0, 0);
            opacity: 0;
          }
        }

        @keyframes glitch-blue {
          0% {
            transform: translate(10px, 15px);
            opacity: 1;
          }
          18% {
            transform: translate(-15px, -10px);
          }
          35% {
            transform: translate(12px, 8px);
          }
          50% {
            transform: translate(-14px, -12px);
          }
          65% {
            transform: translate(9px, 7px);
          }
          78% {
            transform: translate(-6px, -5px);
          }
          92% {
            transform: translate(4px, 3px);
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
