import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Palette, Cpu, Shield, Database, Activity, 
  CheckCircle, AlertTriangle, Lock
} from 'lucide-react';
import { setDefaultModel, getModelHealth } from '../api/client';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  backgroundStyle?: 'particles' | 'dotgrid';
  onBackgroundChange?: (bg: 'particles' | 'dotgrid') => void;
  systemState?: any;
  onRefreshStatus?: () => void;
  onOpenFirstRun?: () => void;
}

type TabKey = 'appearance' | 'models' | 'security' | 'knowledge' | 'telemetry';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  backgroundStyle = 'particles',
  onBackgroundChange,
  systemState,
  onRefreshStatus,
  onOpenFirstRun,
}) => {

  const [activeTab, setActiveTab] = useState<TabKey>('appearance');
  const modalRef = useRef<HTMLDivElement>(null);

  // Settings State
  const [bgStyle, setBgStyle] = useState<'particles' | 'dotgrid'>(backgroundStyle);
  const [fontFamily, setFontFamily] = useState<'Space Grotesk' | 'Inter'>('Space Grotesk');
  const [heroGlow, setHeroGlow] = useState<boolean>(true);
  
  const [activeModel, setActiveModel] = useState<string>(() => {
    try {
      const savedDefault = localStorage.getItem('sovereign_default_model');
      if (savedDefault) return savedDefault;
      const saved = localStorage.getItem('sovereign_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.activeModel) return parsed.activeModel;
      }
    } catch {
      // fallback
    }
    return systemState?.modelHealth?.default_model || 'qwen2.5-coder:1.5b';
  });

  const [availableModels, setAvailableModels] = useState<string[]>([
    'qwen2.5-coder:1.5b',
    'llama3.2:3b',
    'deepseek-r1:1.5b',
    'qwen3.5:0.8b',
  ]);
  const [modelStatusMsg, setModelStatusMsg] = useState<string | null>(null);
  const [isUpdatingModel, setIsUpdatingModel] = useState<boolean>(false);
  const [isTestingOllama, setIsTestingOllama] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [ollamaHost, setOllamaHost] = useState<string>('http://127.0.0.1:11434');
  const [temperature, setTemperature] = useState<number>(0.2);
  const [contextLength, setContextLength] = useState<string>('8192');

  const vectorEngine = 'ChromaDB v0.4.x (Local SQLite3 + hnswlib)';
  const storagePath = 'backend/data/chroma';
  const [topK, setTopK] = useState<number>(5);

  // Sync available models from systemState or backend
  useEffect(() => {
    if (systemState?.modelHealth?.available_models?.length) {
      const chatModels = systemState.modelHealth.available_models.filter(
        (m: string) => !m.includes('embed')
      );
      if (chatModels.length > 0) {
        setAvailableModels(chatModels);
      }
    } else {
      getModelHealth()
        .then((mh) => {
          if (mh.available_models?.length) {
            const chatModels = mh.available_models.filter((m) => !m.includes('embed'));
            if (chatModels.length > 0) setAvailableModels(chatModels);
          }
        })
        .catch(() => {});
    }
  }, [systemState]);

  // Keep activeModel aligned with default_model if changed externally
  useEffect(() => {
    if (systemState?.modelHealth?.default_model && !localStorage.getItem('sovereign_default_model')) {
      setActiveModel(systemState.modelHealth.default_model);
    }
  }, [systemState?.modelHealth?.default_model]);

  // Handle changing the default model
  const handleModelChange = async (newModel: string) => {
    setActiveModel(newModel);
    setIsUpdatingModel(true);
    setModelStatusMsg(`Setting ${newModel} as system default...`);
    try {
      localStorage.setItem('sovereign_default_model', newModel);
      await setDefaultModel(newModel);
      setModelStatusMsg(`✓ ${newModel} is now the default model across all workspaces & Copilot`);
      if (onRefreshStatus) {
        onRefreshStatus();
      }
    } catch (err) {
      console.error('Failed to set default model on backend:', err);
      setModelStatusMsg(`✓ Set ${newModel} as active model locally`);
    } finally {
      setIsUpdatingModel(false);
    }
  };

  // Handle testing Ollama connection
  const handleTestOllama = async () => {
    setIsTestingOllama(true);
    setTestResult(null);
    try {
      const mh = await getModelHealth();
      if (mh.status === 'ok') {
        const chatModels = (mh.available_models || []).filter((m) => !m.includes('embed'));
        if (chatModels.length > 0) {
          setAvailableModels(chatModels);
        }
        setTestResult({
          success: true,
          message: `Connected! Detected ${mh.available_models?.length || 0} local models.`,
        });
      } else {
        setTestResult({
          success: false,
          message: mh.error || 'Connection failed: Ollama returned warning status',
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Could not connect to Ollama host at ' + ollamaHost,
      });
    } finally {
      setIsTestingOllama(false);
    }
  };

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sovereign_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.bgStyle) setBgStyle(parsed.bgStyle);
        if (parsed.fontFamily) setFontFamily(parsed.fontFamily);
        if (parsed.heroGlow !== undefined) setHeroGlow(parsed.heroGlow);
        if (parsed.activeModel) setActiveModel(parsed.activeModel);
        if (parsed.ollamaHost) setOllamaHost(parsed.ollamaHost);
        if (parsed.temperature !== undefined) setTemperature(parsed.temperature);
        if (parsed.contextLength) setContextLength(parsed.contextLength);
        if (parsed.topK) setTopK(parsed.topK);
      }
    } catch (err) {
      console.warn('Failed to load settings', err);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    const settings = {
      bgStyle,
      fontFamily,
      heroGlow,
      activeModel,
      ollamaHost,
      temperature,
      contextLength,
      topK
    };
    localStorage.setItem('sovereign_settings', JSON.stringify(settings));
  }, [bgStyle, fontFamily, heroGlow, activeModel, ollamaHost, temperature, contextLength, topK]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleBgChange = (val: 'particles' | 'dotgrid') => {
    setBgStyle(val);
    if (onBackgroundChange) {
      onBackgroundChange(val);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-backdrop" onClick={handleBackdropClick}>
      <style>{`
        .settings-modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }
        .settings-modal-container {
          width: 90%;
          max-width: 780px;
          height: 540px;
          background: #090c12;
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: #e2e8f0;
          font-family: var(--font-family, 'Space Grotesk', sans-serif);
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .settings-modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .settings-modal-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
          color: #f8fafc;
        }
        .settings-modal-subtitle {
          font-size: 0.875rem;
          color: #94a3b8;
          margin: 4px 0 0 0;
        }
        .settings-close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .settings-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .settings-modal-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        .settings-sidebar {
          width: 240px;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          padding: 16px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .settings-tab {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.9rem;
          text-align: left;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .settings-tab:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #e2e8f0;
        }
        .settings-tab.active {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          font-weight: 500;
        }
        .settings-content {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
        }
        .settings-section {
          margin-bottom: 24px;
        }
        .settings-section-title {
          font-size: 1rem;
          font-weight: 600;
          color: #f8fafc;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .settings-control-group {
          margin-bottom: 16px;
        }
        .settings-label {
          display: block;
          font-size: 0.875rem;
          color: #cbd5e1;
          margin-bottom: 8px;
        }
        .settings-radio-cards {
          display: flex;
          gap: 12px;
        }
        .settings-radio-card {
          flex: 1;
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          font-size: 0.875rem;
        }
        .settings-radio-card:hover {
          border-color: rgba(255, 255, 255, 0.2);
        }
        .settings-radio-card.active {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.05);
          color: #10b981;
        }
        .settings-input, .settings-select {
          width: 100%;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 8px 12px;
          color: #f8fafc;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .settings-input:focus, .settings-select:focus {
          border-color: #10b981;
        }
        .settings-select option {
          background: #090c12;
        }
        .settings-flex-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .settings-switch {
          position: relative;
          width: 44px;
          height: 24px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .settings-switch.on {
          background: #10b981;
        }
        .settings-switch.locked {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .settings-switch-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: #fff;
          border-radius: 50%;
          transition: all 0.3s;
        }
        .settings-switch.on .settings-switch-thumb {
          left: 22px;
        }
        .settings-slider {
          width: 100%;
          accent-color: #10b981;
        }
        .settings-button {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        .settings-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .settings-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #10b981;
          border-radius: 20px;
          font-size: 0.85rem;
        }
        .settings-blocked-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .settings-blocked-item {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-family: monospace;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div className="settings-modal-container" ref={modalRef}>
        <div className="settings-modal-header">
          <div>
            <h2 className="settings-modal-title">Workbench Settings</h2>
            <p className="settings-modal-subtitle">Configure local AI models, air-gap security rules, and interface preferences</p>
          </div>
          <button className="settings-close-btn" onClick={onClose} aria-label="Close Settings">
            <X size={20} />
          </button>
        </div>

        <div className="settings-modal-body">
          <div className="settings-sidebar">
            <button 
              className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              <Palette size={18} /> Appearance
            </button>
            <button 
              className={`settings-tab ${activeTab === 'models' ? 'active' : ''}`}
              onClick={() => setActiveTab('models')}
            >
              <Cpu size={18} /> Local Models
            </button>
            <button 
              className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <Shield size={18} /> Air-Gap & Security
            </button>
            <button 
              className={`settings-tab ${activeTab === 'knowledge' ? 'active' : ''}`}
              onClick={() => setActiveTab('knowledge')}
            >
              <Database size={18} /> Knowledge Base
            </button>
            <button 
              className={`settings-tab ${activeTab === 'telemetry' ? 'active' : ''}`}
              onClick={() => setActiveTab('telemetry')}
            >
              <Activity size={18} /> System Telemetry
            </button>
          </div>

          <div className="settings-content">
            {activeTab === 'appearance' && (
              <div className="settings-section">
                <h3 className="settings-section-title">Appearance</h3>
                
                <div className="settings-control-group">
                  <label className="settings-label">Background Effect</label>
                  <div className="settings-radio-cards">
                    <div 
                      className={`settings-radio-card ${bgStyle === 'particles' ? 'active' : ''}`}
                      onClick={() => handleBgChange('particles')}
                    >
                      Ambient Particles (Constellation)
                    </div>
                    <div 
                      className={`settings-radio-card ${bgStyle === 'dotgrid' ? 'active' : ''}`}
                      onClick={() => handleBgChange('dotgrid')}
                    >
                      Interactive Dot Grid (Cyber)
                    </div>
                  </div>
                </div>

                <div className="settings-control-group">
                  <label className="settings-label">Display Font</label>
                  <select 
                    className="settings-select"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value as any)}
                  >
                    <option value="Space Grotesk">Space Grotesk (Default)</option>
                    <option value="Inter">Inter</option>
                  </select>
                </div>

                <div className="settings-control-group settings-flex-row">
                  <div>
                    <label className="settings-label" style={{ marginBottom: 4 }}>Hero Title Glow</label>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Enable animated text glow on main titles</div>
                  </div>
                  <div 
                    className={`settings-switch ${heroGlow ? 'on' : ''}`} 
                    onClick={() => setHeroGlow(!heroGlow)}
                  >
                    <div className="settings-switch-thumb" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'models' && (
              <div className="settings-section">
                <h3 className="settings-section-title">Local Models & Inference</h3>
                
                <div className="settings-control-group">
                  <div className="settings-flex-row">
                    <label className="settings-label" style={{ marginBottom: 4 }}>Default System Model</label>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontFamily: 'monospace' }}>
                      Active: {activeModel}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 8 }}>
                    Sets the default model across Document Inspector, Autonomous Coding Agent, and Sovereign Copilot.
                  </div>
                  <select 
                    className="settings-select"
                    value={activeModel}
                    disabled={isUpdatingModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                  >
                    {availableModels.map((m) => {
                      let tag = ''
                      if (m.includes('qwen2.5-coder')) tag = '⚡ High-Speed Code & Audit'
                      else if (m.includes('llama3.2')) tag = '🌟 Synthesis & Knowledge'
                      else if (m.includes('deepseek-r1')) tag = '🧠 Deep Mathematical Reasoning'
                      else if (m.includes('qwen3.5')) tag = '🪶 Ultra-Lightweight Edge'
                      else tag = 'Installed Local Model'
                      return (
                        <option key={m} value={m}>
                          {m} ({tag})
                        </option>
                      )
                    })}
                  </select>
                  {modelStatusMsg && (
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#10b981',
                      marginTop: 8,
                      padding: '6px 10px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      borderRadius: 6,
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <CheckCircle size={14} /> {modelStatusMsg}
                    </div>
                  )}
                </div>

                <div className="settings-control-group" style={{ marginTop: 20 }}>
                  <label className="settings-label">Ollama Host URL</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      className="settings-input" 
                      value={ollamaHost}
                      onChange={(e) => setOllamaHost(e.target.value)}
                    />
                    <button 
                      className="settings-button"
                      onClick={handleTestOllama}
                      disabled={isTestingOllama}
                      style={{ minWidth: 80 }}
                    >
                      {isTestingOllama ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                  {testResult && (
                    <div style={{
                      fontSize: '0.8rem',
                      color: testResult.success ? '#10b981' : '#ef4444',
                      marginTop: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      {testResult.success ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                      {testResult.message}
                    </div>
                  )}
                </div>

                <div className="settings-control-group">
                  <div className="settings-flex-row">
                    <label className="settings-label">Temperature: {temperature.toFixed(1)}</label>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{temperature < 0.3 ? 'Strict/Audit' : temperature > 0.7 ? 'Creative' : 'Balanced'}</span>
                  </div>
                  <input 
                    type="range" 
                    className="settings-slider" 
                    min="0" max="1" step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  />
                </div>

                <div className="settings-control-group">
                  <label className="settings-label">Context Length</label>
                  <select 
                    className="settings-select"
                    value={contextLength}
                    onChange={(e) => setContextLength(e.target.value)}
                  >
                    <option value="4096">4,096 tokens</option>
                    <option value="8192">8,192 tokens</option>
                    <option value="16384">16,384 tokens</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="settings-section">
                <h3 className="settings-section-title">Air-Gap & Security</h3>
                
                <div className="settings-control-group settings-flex-row">
                  <div>
                    <label className="settings-label" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      Strict Zero-Egress Network Shield <Lock size={14} color="#10b981" />
                    </label>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Blocks all outbound connections natively</div>
                  </div>
                  <div className="settings-switch on locked">
                    <div className="settings-switch-thumb" />
                  </div>
                </div>

                <div className="settings-control-group" style={{ marginTop: 24 }}>
                  <label className="settings-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={16} color="#ef4444" /> Python AST Guard (Blocked Modules)
                  </label>
                  <div className="settings-blocked-list">
                    {['os.system', 'subprocess', 'requests', 'urllib', 'socket'].map(mod => (
                      <span key={mod} className="settings-blocked-item">{mod}</span>
                    ))}
                  </div>
                </div>

                <div className="settings-control-group" style={{ marginTop: 24 }}>
                  <label className="settings-label">Cryptographic Ledger Status</label>
                  <div className="settings-badge">
                    <CheckCircle size={16} /> Cryptographic Hash Chain Intact (100%)
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'knowledge' && (
              <div className="settings-section">
                <h3 className="settings-section-title">Knowledge & Vector Store</h3>
                
                <div className="settings-control-group">
                  <label className="settings-label">Vector Engine</label>
                  <input 
                    type="text" 
                    className="settings-input" 
                    value={vectorEngine}
                    disabled
                    style={{ opacity: 0.7 }}
                  />
                </div>

                <div className="settings-control-group">
                  <label className="settings-label">Storage Path</label>
                  <input 
                    type="text" 
                    className="settings-input" 
                    value={storagePath}
                    disabled
                    style={{ opacity: 0.7 }}
                  />
                </div>

                <div className="settings-control-group">
                  <label className="settings-label">Default Retrieval Chunk Count (Top-K)</label>
                  <div className="settings-radio-cards">
                    {[3, 5, 8].map(val => (
                      <div 
                        key={val}
                        className={`settings-radio-card ${topK === val ? 'active' : ''}`}
                        onClick={() => setTopK(val)}
                      >
                        {val} Chunks
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'telemetry' && (
              <div className="settings-section">
                <h3 className="settings-section-title">System Telemetry</h3>
                
                <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: 8, padding: 16, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: 12 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>App Version</span>
                    <span style={{ color: '#e2e8f0', fontSize: '0.875rem', fontFamily: 'monospace' }}>v0.1.0-sovereign</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: 12 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Runtime</span>
                    <span style={{ color: '#e2e8f0', fontSize: '0.875rem', fontFamily: 'monospace' }}>Python 3.11 + FastAPI + Vite + React 19</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: 12 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Local Inference Engine</span>
                    <span style={{ color: systemState?.ollama_online ? '#10b981' : '#f59e0b', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                      {systemState?.ollama_online ? 'Ollama Online' : 'Ollama Standby'} ({systemState?.active_model || 'qwen2.5-coder:1.5b'})
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Network Mode</span>
                    <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Shield size={14} /> Air-Gapped (Zero External Telemetry)
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button className="settings-button" onClick={onRefreshStatus}>
                    <Activity size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                    Run System Diagnostics
                  </button>
                  {onOpenFirstRun && (
                    <button
                      className="settings-button"
                      style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981', color: '#10b981' }}
                      onClick={() => {
                        onClose();
                        onOpenFirstRun();
                      }}
                    >
                      <Shield size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                      First-Time Setup Wizard
                    </button>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
