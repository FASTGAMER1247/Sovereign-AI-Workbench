import React, { useId } from 'react';

export interface StarBorderProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  speed?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  starSize?: number;
  as?: React.ElementType;
}

export const StarBorder: React.FC<StarBorderProps> = ({
  children,
  className = '',
  style = {},
  color = '#10B981',
  speed = 6,
  borderRadius = 16,
  borderWidth = 1,
  borderColor = 'rgba(255, 255, 255, 0.08)',
  starSize = 80,
  as: Component = 'div',
}) => {
  const uniqueId = useId().replace(/:/g, '');
  const keyframesName = `star-border-spin-${uniqueId}`;

  return (
    <Component
      className={`star-border-container ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        overflow: 'hidden',
        borderRadius: `${borderRadius}px`,
        padding: `${borderWidth}px`,
        backgroundColor: borderColor,
        ...style,
      }}
    >
      <style>{`
        @keyframes ${keyframesName} {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
      `}</style>
      
      {/* Rotating gradient background for the glowing star effect */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '200%',
          height: '200%',
          background: `conic-gradient(from 0deg, transparent 0%, transparent 80%, ${color} 95%, transparent 100%)`,
          animation: `${keyframesName} ${speed}s linear infinite`,
          zIndex: 0,
        }}
      />
      
      {/* Additional glow for the star */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '200%',
          height: '200%',
          background: `conic-gradient(from 0deg, transparent 0%, transparent 90%, ${color} 95%, transparent 100%)`,
          animation: `${keyframesName} ${speed}s linear infinite`,
          filter: `blur(${starSize / 10}px)`,
          zIndex: 0,
          opacity: 0.8,
        }}
      />

      {/* Inner container to mask out the center, leaving only the border */}
      <div
        style={{
          position: 'relative',
          background: '#07090e',
          borderRadius: `${Math.max(0, borderRadius - borderWidth)}px`,
          zIndex: 1,
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </Component>
  );
};
