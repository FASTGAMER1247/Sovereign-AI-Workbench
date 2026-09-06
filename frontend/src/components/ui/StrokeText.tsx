import React, { useId } from 'react';

export interface StrokeTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  fontSize?: number;
  fontWeight?: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  animationDuration?: number;
  fillDelay?: number;
  fontFamily?: string;
  letterSpacing?: number;
  repeat?: boolean;
}

export function StrokeText({
  text,
  className = '',
  style,
  fontSize = 48,
  fontWeight = 700,
  strokeColor = '#10B981',
  fillColor = 'rgba(255,255,255,0.9)',
  strokeWidth = 1.5,
  animationDuration = 2.5,
  fillDelay = 2.0,
  fontFamily = "'Space Grotesk', system-ui, -apple-system, sans-serif",
  letterSpacing = 0.2,
  repeat = false,
}: StrokeTextProps) {
  const uniqueId = useId().replace(/:/g, '');
  const dashLength = 2000;

  const animationNameStroke = `strokeDraw-${uniqueId}`;
  const animationNameFill = `fillFadeIn-${uniqueId}`;

  const styles = `
    @keyframes ${animationNameStroke} {
      0% {
        stroke-dashoffset: ${dashLength};
      }
      100% {
        stroke-dashoffset: 0;
      }
    }

    @keyframes ${animationNameFill} {
      0% {
        fill: transparent;
      }
      100% {
        fill: ${fillColor};
      }
    }

    .stroke-text-${uniqueId} {
      stroke: ${strokeColor};
      stroke-width: ${strokeWidth}px;
      stroke-dasharray: ${dashLength};
      stroke-dashoffset: ${dashLength};
      fill: transparent;
      filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.25));
      animation: 
        ${animationNameStroke} ${animationDuration}s cubic-bezier(0.25, 1, 0.5, 1) forwards,
        ${animationNameFill} 0.9s ease-in-out ${fillDelay}s forwards;
    }

    ${
      repeat
        ? `
      .stroke-text-container-${uniqueId}:hover .stroke-text-${uniqueId} {
        animation: none;
      }
      .stroke-text-container-${uniqueId}:hover .stroke-text-${uniqueId} {
        animation: 
          ${animationNameStroke} ${animationDuration}s cubic-bezier(0.25, 1, 0.5, 1) forwards,
          ${animationNameFill} 0.9s ease-in-out ${fillDelay}s forwards;
      }
    `
        : ''
    }
  `;

  return (
    <div 
      className={`stroke-text-container-${uniqueId} ${className}`} 
      style={{ ...style, width: '100%', height: fontSize * 1.6 }}
    >
      <style>{styles}</style>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className={`stroke-text-${uniqueId}`}
          style={{
            fontFamily,
            fontSize: `${fontSize}px`,
            fontWeight,
            letterSpacing: `${letterSpacing}px`,
          }}
        >
          {text}
        </text>
      </svg>
    </div>
  );
}
