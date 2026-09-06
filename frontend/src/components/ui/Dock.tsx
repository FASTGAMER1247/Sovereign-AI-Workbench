import React, { useRef, useState } from 'react';

export interface DockItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

export interface DockProps {
  items: DockItem[];
  className?: string;
  style?: React.CSSProperties;
  magnification?: number;
  spread?: number;
  baseSize?: number;
  gap?: number;
  panelBackground?: string;
  panelBorder?: string;
  panelBorderRadius?: number;
  panelPadding?: number;
}

export const Dock: React.FC<DockProps> = ({
  items,
  className = '',
  style = {},
  magnification = 1.35,
  spread = 2,
  baseSize = 40,
  gap = 6,
  panelBackground = 'rgba(255, 255, 255, 0.04)',
  panelBorder = '1px solid rgba(255, 255, 255, 0.08)',
  panelBorderRadius = 16,
  panelPadding = 8,
}) => {
  const [mouseX, setMouseX] = useState<number | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dockRef.current) {
      const rect = dockRef.current.getBoundingClientRect();
      setMouseX(e.clientX - rect.left);
    }
  };

  const handleMouseLeave = () => {
    setMouseX(null);
  };

  return (
    <div
      ref={dockRef}
      className={`dock-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${gap}px`,
        padding: `${panelPadding}px`,
        background: panelBackground,
        border: panelBorder,
        borderRadius: `${panelBorderRadius}px`,
        backdropFilter: 'blur(12px)',
        position: 'relative',
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <style>{`
        .dock-item {
          position: relative;
          display: flex;
          alignItems: center;
          justify-content: center;
          border-radius: 50%;
          cursor: pointer;
          transition: width 0.15s ease-out, height 0.15s ease-out, transform 0.15s ease-out;
          background: transparent;
        }
        .dock-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .dock-item .dock-tooltip {
          position: absolute;
          top: -40px;
          opacity: 0;
          visibility: hidden;
          background: rgba(0, 0, 0, 0.8);
          color: #fff;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          pointer-events: none;
          transition: all 0.2s ease;
          transform: translateY(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .dock-item:hover .dock-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        .dock-item .active-dot {
          position: absolute;
          bottom: -6px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 6px #10B981;
        }
      `}</style>

      {items.map((item, index) => {
        let size = baseSize;

        if (mouseX !== null && dockRef.current) {
          const itemElements = Array.from(dockRef.current.children).filter(
            (el) => el.classList.contains('dock-item')
          ) as HTMLElement[];
          
          if (itemElements[index]) {
            const el = itemElements[index];
            const rect = el.getBoundingClientRect();
            const dockRect = dockRef.current.getBoundingClientRect();
            
            // center of the item relative to dock container
            const center = rect.left - dockRect.left + rect.width / 2;
            const distance = Math.abs(mouseX - center);
            
            const maxDistance = baseSize * spread;
            
            if (distance < maxDistance) {
              const scale = 1 + (magnification - 1) * Math.cos((distance / maxDistance) * (Math.PI / 2));
              size = baseSize * scale;
            }
          }
        }

        return (
          <div
            key={item.id}
            className="dock-item"
            style={{
              width: `${size}px`,
              height: `${size}px`,
            }}
            onClick={item.onClick}
          >
            <div className="dock-tooltip">{item.label}</div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              transform: `scale(${size / baseSize})`,
              color: item.isActive ? '#10B981' : 'rgba(255,255,255,0.7)',
              transition: 'transform 0.15s ease-out, color 0.15s ease-out',
            }}>
              {item.icon}
            </div>
            {item.isActive && <div className="active-dot" />}
          </div>
        );
      })}
    </div>
  );
};
