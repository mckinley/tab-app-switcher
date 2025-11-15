import { ReactNode, useEffect, useState } from "react";

interface RGBSplitGlitchProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
}

export const RGBSplitGlitch = ({ 
  children, 
  className = "",
  duration = 1200,
  delay = 0 
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
      {/* Red channel */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          mixBlendMode: 'screen',
          opacity: isAnimating ? 1 : 0,
          transform: isAnimating ? 'translateX(4px)' : 'translateX(0)',
          filter: isAnimating ? 'blur(1px)' : 'blur(0)',
          transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          color: '#ff0000'
        }}
      >
        <div style={{ filter: 'brightness(0) invert(1) sepia(1) saturate(10000%) hue-rotate(0deg)' }}>
          {children}
        </div>
      </div>

      {/* Cyan channel */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          mixBlendMode: 'screen',
          opacity: isAnimating ? 1 : 0,
          transform: isAnimating ? 'translateX(-4px)' : 'translateX(0)',
          filter: isAnimating ? 'blur(1px)' : 'blur(0)',
          transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          color: '#00ffff'
        }}
      >
        <div style={{ filter: 'brightness(0) invert(1) sepia(1) saturate(10000%) hue-rotate(180deg)' }}>
          {children}
        </div>
      </div>

      {/* Main content with fade and blur */}
      <div 
        className="relative"
        style={{
          opacity: isAnimating ? 0 : 1,
          filter: isAnimating ? 'blur(3px)' : 'blur(0)',
          transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`
        }}
      >
        {children}
      </div>
    </div>
  );
};
