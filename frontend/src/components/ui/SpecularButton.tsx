import React, { useRef, useState } from 'react';

export interface SpecularButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

export const SpecularButton: React.FC<SpecularButtonProps> = ({
  children,
  active = false,
  className = '',
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPosition({ x, y });
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`specular-button ${active ? 'active' : ''} ${className}`}
      {...props}
    >
      <style>{`
        .specular-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 6px 12px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.2s ease;
          outline: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .specular-button:hover {
          color: rgba(255, 255, 255, 1);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .specular-button.active {
          color: #10B981;
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.2);
        }

        .specular-button .glare {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(
            circle at var(--x) var(--y),
            rgba(255, 255, 255, 0.15) 0%,
            transparent 60%
          );
          opacity: var(--opacity);
          transition: opacity 0.3s ease;
          z-index: 1;
        }

        .specular-button .edge-highlight {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          padding: 1px;
          background: radial-gradient(
            circle at var(--x) var(--y),
            rgba(255, 255, 255, 0.4) 0%,
            transparent 50%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: var(--opacity);
          transition: opacity 0.3s ease;
          z-index: 2;
        }

        .specular-button .content {
          position: relative;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 6px;
        }
      `}</style>
      
      <div 
        className="glare"
        style={{
          '--x': `${position.x}%`,
          '--y': `${position.y}%`,
          '--opacity': opacity
        } as React.CSSProperties}
      />
      <div 
        className="edge-highlight"
        style={{
          '--x': `${position.x}%`,
          '--y': `${position.y}%`,
          '--opacity': opacity
        } as React.CSSProperties}
      />
      
      <div className="content">
        {children}
      </div>
    </button>
  );
};
