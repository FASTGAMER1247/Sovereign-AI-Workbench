import React from 'react'

export interface SchematicGridProps {
  className?: string
  style?: React.CSSProperties
  gridSize?: number
  subdivisions?: number
}

/**
 * SchematicGrid
 * 
 * An authentic industrial engineering CAD/drafting grid.
 * Strictly static, low-contrast, with zero glow, zero cursor shimmer,
 * and zero CPU-consuming animation loops.
 */
export const SchematicGrid: React.FC<SchematicGridProps> = ({
  className = '',
  style,
  gridSize = 64,
  subdivisions = 4,
}) => {
  const subSize = gridSize / subdivisions

  return (
    <div
      aria-hidden="true"
      className={`schematic-grid ${className}`}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        ...style,
      }}
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      >
        <defs>
          {/* Minor Subdivision Grid (16px) */}
          <pattern
            id="schematic-sub-grid"
            width={subSize}
            height={subSize}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${subSize} 0 L 0 0 0 ${subSize}`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.018)"
              strokeWidth="1"
            />
          </pattern>

          {/* Major Grid (64px) with Subtle Technical Intersection Crosshairs */}
          <pattern
            id="schematic-major-grid"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
          >
            {/* Fill with minor grid */}
            <rect width={gridSize} height={gridSize} fill="url(#schematic-sub-grid)" />

            {/* Major orthogonal boundary lines */}
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.04)"
              strokeWidth="1"
            />

            {/* Precision crosshairs at (0, 0) intersection */}
            <path
              d="M -3 0 L 3 0 M 0 -3 L 0 3"
              fill="none"
              stroke="rgba(255, 255, 255, 0.09)"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        {/* Base Grid Layer */}
        <rect width="100%" height="100%" fill="url(#schematic-major-grid)" />
      </svg>
    </div>
  )
}
