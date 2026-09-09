import React from 'react';

export interface StaticBackgroundProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * StaticBackground
 * Completely static, zero-CPU ambient background.
 * Provides a crisp obsidian canvas (#07090e) with a subtle static dot grid
 * and a gentle ambient vignette. Zero animations, zero canvas loops.
 */
export const StaticBackground: React.FC<StaticBackgroundProps> = ({
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`static-background ${className}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        backgroundColor: '#07090e',
        backgroundImage: `
          radial-gradient(circle at 50% 15%, rgba(16, 185, 129, 0.05) 0%, transparent 60%),
          radial-gradient(circle at 80% 85%, rgba(56, 189, 248, 0.03) 0%, transparent 50%),
          radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 24px 24px',
        backgroundPosition: '0 0, 0 0, 0 0',
        ...style,
      }}
    />
  );
};
