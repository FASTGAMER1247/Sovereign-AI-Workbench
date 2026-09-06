import React, { useRef, useState } from 'react';
import { Home, FileCheck, Code2, Database } from 'lucide-react';
import { StarBorder } from './StarBorder';
import { SpecularButton } from './SpecularButton';

export interface DockTabsProps {
  activeTab?: string;
  onTabChange?: (tab: 'home' | 'workflow_a' | 'workflow_b' | 'knowledge' | 'security') => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DockTabs: React.FC<DockTabsProps> = ({
  activeTab = 'home',
  onTabChange,
  className = '',
  style = {},
}) => {
  const [mouseX, setMouseX] = useState<number | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const tabs: Array<{
    id: 'home' | 'workflow_a' | 'workflow_b' | 'knowledge';
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: 'home', label: 'Home', icon: <Home size={13} /> },
    { id: 'workflow_a', label: 'Document Inspector', icon: <FileCheck size={13} /> },
    { id: 'workflow_b', label: 'Coding Agent', icon: <Code2 size={13} /> },
    { id: 'knowledge', label: 'Knowledge Base', icon: <Database size={13} /> }
  ];

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
      className={`dock-tabs-wrapper ${className}`} 
      style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        height: '52px', 
        alignItems: 'center',
        padding: '0 16px',
        ...style,
      }}
    >
      <style>{`
        .dock-tab-btn {
          transition: transform 0.1s ease-out;
          will-change: transform;
        }
        .dock-tabs-container:not(:hover) .dock-tab-btn {
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .dock-tab-btn.active .active-glow {
          position: absolute;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 2px;
          background: #10B981;
          border-radius: 2px;
          box-shadow: 0 -2px 10px rgba(16, 185, 129, 0.8), 0 0 4px rgba(16, 185, 129, 0.5);
          z-index: 10;
        }
      `}</style>

      <StarBorder 
        borderRadius={16} 
        borderWidth={1} 
        speed={6} 
        color="#10B981" 
        starSize={60}
      >
        <div
          ref={dockRef}
          className="dock-tabs-container"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 6px',
            background: 'rgba(7, 9, 14, 0.7)',
            backdropFilter: 'blur(16px)',
            borderRadius: '15px', // slightly less to fit inside StarBorder's border
            position: 'relative'
          }}
        >
          {tabs.map((tab, index) => {
            let scale = 1;
            
            if (mouseX !== null && dockRef.current) {
               const els = Array.from(dockRef.current.children) as HTMLElement[];
               // children includes the tabs.
               if (els[index]) {
                 const rect = els[index].getBoundingClientRect();
                 const dockRect = dockRef.current.getBoundingClientRect();
                 const center = rect.left - dockRect.left + rect.width / 2;
                 const distance = Math.abs(mouseX - center);
                 
                 // How far the effect spreads
                 const maxDistance = 120;
                 if (distance < maxDistance) {
                   const scaleFactor = 1.05;
                   scale = 1 + (scaleFactor - 1) * Math.cos((distance / maxDistance) * (Math.PI / 2));
                 }
               }
            }

            const isActive = activeTab === tab.id;

            return (
              <SpecularButton
                key={tab.id}
                className={`dock-tab-btn dock-tab`}
                active={isActive}
                onClick={() => onTabChange?.(tab.id)}
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'bottom center',
                  zIndex: isActive ? 5 : 1,
                  padding: '5px 10px',
                  fontSize: '12px',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {isActive && <div className="active-glow" />}
              </SpecularButton>
            );
          })}
        </div>
      </StarBorder>
    </div>
  );
};
