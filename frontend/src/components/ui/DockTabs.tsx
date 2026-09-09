import React, { useRef } from 'react';
import { Home, FileCheck, Code2, Database } from 'lucide-react';

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

  return (
    <div 
      className={`dock-tabs-wrapper ${className}`} 
      style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        height: '42px', 
        alignItems: 'center',
        padding: '0 8px',
        ...style,
      }}
    >
      <style>{`
        .dock-tab-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--radius-xs);
          padding: 5px 11px;
          color: var(--color-text-secondary);
          font-size: 11.5px;
          font-family: inherit;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .dock-tab-btn:hover {
          color: var(--color-text-primary);
          background: rgba(255, 255, 255, 0.04);
        }

        .dock-tab-btn.active {
          color: var(--color-text-primary);
          background: var(--color-surface-2);
          border-color: var(--color-border-strong);
        }
        
        .dock-tab-btn.active .active-glow {
          position: absolute;
          bottom: -1px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 2px;
          background: #F59E0B;
          border-radius: 1px;
          box-shadow: 0 -1px 6px rgba(245, 158, 11, 0.7);
        }
      `}</style>

      {/* Industrial Precision Instrument Bezel */}
      <div
        ref={dockRef}
        className="dock-tabs-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          padding: '3px 5px',
          background: 'var(--color-panel)',
          border: '1px solid var(--color-border-strong)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
          position: 'relative'
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={`dock-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange?.(tab.id)}
            >
              <span style={{ color: isActive ? '#F59E0B' : 'inherit', display: 'flex', alignItems: 'center' }}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {isActive && <div className="active-glow" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
