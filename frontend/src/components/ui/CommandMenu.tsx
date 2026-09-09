import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Home,
  FileCheck,
  Code2,
  Database,
  Shield,
  Zap,
  RefreshCw,
  MessageSquare,
  Search,
  Lock,
  Settings,
} from 'lucide-react';

export interface CommandMenuProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSelectWorkflowMode: (
    mode: 'home' | 'workflow_a' | 'workflow_b' | 'knowledge' | 'security'
  ) => void;
  onTriggerDemo?: () => void;
  onRefreshStatus?: () => void;
  onOpenCopilot?: () => void;
  onSearchQuery?: (query: string) => void;
  onOpenSettings?: () => void;
  onOpenFirstRun?: () => void;
}

interface Command {
  id: string;
  title: string;
  description: string;
  category: 'Workspaces' | 'Quick Actions' | 'Knowledge & Security';
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

export const CommandMenu: React.FC<CommandMenuProps> = ({
  isOpen: externalIsOpen,
  onClose,
  onSelectWorkflowMode,
  onTriggerDemo,
  onRefreshStatus,
  onOpenCopilot,
  onSearchQuery,
  onOpenSettings,
  onOpenFirstRun,
}) => {

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const closeMenu = () => {
    setInternalIsOpen(false);
    if (onClose) onClose();
    setQuery('');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (externalIsOpen === undefined) {
          setInternalIsOpen((prev) => !prev);
        } else if (!isOpen) {
          // If controlled and closed, we can't open it from here unless we have an onOpen,
          // but typically the parent handles the global listener if it's fully controlled.
          // We'll just toggle internal if undefined.
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        if (internalIsOpen) {
          closeMenu();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [externalIsOpen, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const commands: Command[] = useMemo(
    () => [
      {
        id: 'workspace-home',
        title: 'Home Overview',
        description: 'Return to dashboard home',
        category: 'Workspaces',
        icon: <Home size={15} />,
        shortcut: 'H',
        action: () => onSelectWorkflowMode('home'),
      },
      {
        id: 'workspace-workflow-a',
        title: 'Document Inspector',
        description: 'Review and analyze documents',
        category: 'Workspaces',
        icon: <FileCheck size={15} />,
        shortcut: 'D',
        action: () => onSelectWorkflowMode('workflow_a'),
      },
      {
        id: 'workspace-workflow-b',
        title: 'Autonomous Coding Agent',
        description: 'Initialize coding workflows',
        category: 'Workspaces',
        icon: <Code2 size={15} />,
        shortcut: 'C',
        action: () => onSelectWorkflowMode('workflow_b'),
      },
      {
        id: 'workspace-knowledge',
        title: 'Knowledge Base & SOP Vault',
        description: 'Access standard operating procedures',
        category: 'Workspaces',
        icon: <Database size={15} />,
        shortcut: 'K',
        action: () => onSelectWorkflowMode('knowledge'),
      },
      {
        id: 'workspace-security',
        title: 'Security Center & Audit Ledger',
        description: 'Review security audits and logs',
        category: 'Workspaces',
        icon: <Shield size={15} />,
        shortcut: 'S',
        action: () => onSelectWorkflowMode('security'),
      },
      {
        id: 'action-demo',
        title: 'Quick Demo Package',
        description: 'Initialize quick demonstration',
        category: 'Quick Actions',
        icon: <Zap size={15} />,
        action: () => {
          if (onTriggerDemo) onTriggerDemo();
        },
      },
      {
        id: 'action-refresh',
        title: 'Refresh System Telemetry',
        description: 'Update all status indicators',
        category: 'Quick Actions',
        icon: <RefreshCw size={15} />,
        action: () => {
          if (onRefreshStatus) onRefreshStatus();
        },
      },
      {
        id: 'action-copilot',
        title: 'Focus Sovereign Copilot',
        description: 'Open AI assistant',
        category: 'Quick Actions',
        icon: <MessageSquare size={15} />,
        action: () => {
          if (onOpenCopilot) onOpenCopilot();
          else onSelectWorkflowMode('home');
        },
      },
      {
        id: 'action-settings',
        title: 'Workbench Settings',
        description: 'Configure local AI models, air-gap rules & interface',
        category: 'Quick Actions',
        icon: <Settings size={15} />,
        shortcut: 'Ctrl+,',
        action: () => {
          if (onOpenSettings) onOpenSettings();
        },
      },
      {
        id: 'action-setup',
        title: 'First-Time Setup & Diagnostics',
        description: 'Verify local models, runtime, and air-gap integrity',
        category: 'Quick Actions',
        icon: <Shield size={15} />,
        shortcut: 'F',
        action: () => {
          if (onOpenFirstRun) onOpenFirstRun();
        },
      },

      {
        id: 'ks-query-sop',
        title: 'Query SOP-REF-570 Piping Limits',
        description: 'Search SOP database',
        category: 'Knowledge & Security',
        icon: <Search size={15} />,
        action: () => {
          if (onSearchQuery) onSearchQuery('SOP-REF-570 Piping Limits');
        },
      },
      {
        id: 'ks-run-probe',
        title: 'Run Zero-Egress Network Probe',
        description: 'Security diagnostics',
        category: 'Knowledge & Security',
        icon: <Lock size={15} />,
        action: () => onSelectWorkflowMode('security'),
      },
    ],
    [
      onSelectWorkflowMode,
      onTriggerDemo,
      onRefreshStatus,
      onOpenCopilot,
      onSearchQuery,
    ]
  );

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(lowerQuery) ||
        cmd.description.toLowerCase().includes(lowerQuery) ||
        cmd.category.toLowerCase().includes(lowerQuery)
    );
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredCommands.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCommands.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        filteredCommands[selectedIndex].action();
        closeMenu();
      }
    }
  };

  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          .cmd-palette-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            z-index: 9999;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding-top: 15vh;
            animation: cmd-fade-in 0.15s ease-out;
          }
          .cmd-palette-modal {
            width: 100%;
            max-width: 640px;
            background: #090c12;
            backdrop-filter: blur(16px);
            border: 1px solid rgba(16, 185, 129, 0.25);
            border-radius: 12px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(16, 185, 129, 0.05);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            color: #fff;
            font-family: system-ui, -apple-system, sans-serif;
            animation: cmd-slide-down 0.2s ease-out;
          }
          .cmd-palette-header {
            display: flex;
            align-items: center;
            padding: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          .cmd-palette-input {
            flex: 1;
            background: transparent;
            border: none;
            color: #fff;
            font-size: 16px;
            margin-left: 12px;
            outline: none;
          }
          .cmd-palette-input::placeholder {
            color: rgba(255, 255, 255, 0.4);
          }
          .cmd-palette-esc {
            font-size: 10px;
            text-transform: uppercase;
            padding: 4px 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            color: rgba(255, 255, 255, 0.6);
            letter-spacing: 1px;
          }
          .cmd-palette-content {
            max-height: 400px;
            overflow-y: auto;
            padding: 8px 0;
          }
          .cmd-palette-content::-webkit-scrollbar {
            width: 8px;
          }
          .cmd-palette-content::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
          }
          .cmd-palette-category {
            font-size: 10.5px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: rgba(255, 255, 255, 0.4);
            padding: 8px 16px;
            margin-top: 8px;
          }
          .cmd-palette-item {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            margin: 0 8px;
            border-radius: 8px;
            cursor: pointer;
            border-left: 3px solid transparent;
            transition: all 0.1s ease;
          }
          .cmd-palette-item.active {
            background: rgba(16, 185, 129, 0.12);
            border-left-color: #10B981;
          }
          .cmd-palette-item-icon {
            color: rgba(255, 255, 255, 0.5);
            margin-right: 12px;
            display: flex;
          }
          .cmd-palette-item.active .cmd-palette-item-icon {
            color: #10B981;
          }
          .cmd-palette-item-text {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .cmd-palette-item-title {
            font-size: 14px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
          }
          .cmd-palette-item-desc {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
            margin-top: 2px;
          }
          .cmd-palette-item-shortcut {
            font-size: 11px;
            padding: 2px 6px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            color: rgba(255, 255, 255, 0.6);
            margin-left: 12px;
          }
          .cmd-palette-empty {
            padding: 32px;
            text-align: center;
            color: rgba(255, 255, 255, 0.5);
            font-size: 14px;
          }
          .cmd-palette-footer {
            padding: 12px 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(0, 0, 0, 0.2);
          }
          .cmd-palette-footer-hint {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.4);
            display: flex;
            align-items: center;
            gap: 4px;
          }
          @keyframes cmd-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes cmd-slide-down {
            from { opacity: 0; transform: scale(0.98) translateY(-10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}
      </style>
      <div className="cmd-palette-overlay" onClick={closeMenu}>
        <div
          className="cmd-palette-modal"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          <div className="cmd-palette-header">
            <Search size={20} color="#10B981" />
            <input
              ref={inputRef}
              className="cmd-palette-input"
              placeholder="Type a command or search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="cmd-palette-esc">ESC</div>
          </div>

          <div className="cmd-palette-content" ref={listRef}>
            {filteredCommands.length === 0 ? (
              <div className="cmd-palette-empty">
                No matching commands found for "{query}"
              </div>
            ) : (
              filteredCommands.map((cmd, index) => {
                const showCategory =
                  index === 0 ||
                  filteredCommands[index - 1].category !== cmd.category;

                return (
                  <React.Fragment key={cmd.id}>
                    {showCategory && (
                      <div className="cmd-palette-category">
                        {cmd.category}
                      </div>
                    )}
                    <div
                      className={`cmd-palette-item ${
                        index === selectedIndex ? 'active' : ''
                      }`}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => {
                        cmd.action();
                        closeMenu();
                      }}
                    >
                      <div className="cmd-palette-item-icon">{cmd.icon}</div>
                      <div className="cmd-palette-item-text">
                        <div className="cmd-palette-item-title">
                          {cmd.title}
                        </div>
                        <div className="cmd-palette-item-desc">
                          {cmd.description}
                        </div>
                      </div>
                      {cmd.shortcut && (
                        <div className="cmd-palette-item-shortcut">
                          {cmd.shortcut}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>

          <div className="cmd-palette-footer">
            <span className="cmd-palette-footer-hint">↑↓ to navigate</span>
            <span className="cmd-palette-footer-hint">·</span>
            <span className="cmd-palette-footer-hint">↵ to select</span>
            <span className="cmd-palette-footer-hint">·</span>
            <span className="cmd-palette-footer-hint">esc to close</span>
          </div>
        </div>
      </div>
    </>
  );
};
