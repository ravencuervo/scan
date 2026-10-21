import React from 'react';
import './Sidebar.css';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onLogout,
}) => {
  return (
    <aside className="app-sidebar">
      <div>
        {/* Brand Header */}
        <div className="sidebar-brand-box">
          <div className="sidebar-brand">
            <div className="sidebar-logo-wrap">
              <img
                src="/images/logos/logo.svg"
                alt="AeroScan Logo"
                className="sidebar-logo-img"
              />
            </div>
            <div>
              <div className="sidebar-title-h1">AeroScan</div>
              <div className="sidebar-title-sub">WiFi Spectrum Analytics</div>
            </div>
          </div>

          <div className="sidebar-status-pill">
            <span>
              <span className="sidebar-dot-active"></span> MOTOR RF: ACTIVO
            </span>
            <span>40MHz FFT</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-menu-nav">
          <button
            className={`sidebar-menu-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => onTabChange('dashboard')}
          >
            <i className="bi bi-grid-1x2"></i>
            <span>Dashboard</span>
          </button>

          <button
            className={`sidebar-menu-btn ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => onTabChange('live')}
          >
            <i className="bi bi-broadcast"></i>
            <span>Captura en vivo</span>
          </button>

          <button
            className={`sidebar-menu-btn ${activeTab === 'channels' ? 'active' : ''}`}
            onClick={() => onTabChange('channels')}
          >
            <i className="bi bi-bar-chart"></i>
            <span>Análisis de canales</span>
          </button>

          <button
            className={`sidebar-menu-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => onTabChange('history')}
          >
            <i className="bi bi-clock-history"></i>
            <span>Historial y comparación</span>
          </button>

          <button
            className={`sidebar-menu-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => onTabChange('reports')}
          >
            <i className="bi bi-file-earmark-text"></i>
            <span>Reportes técnicos</span>
          </button>

          <button
            className={`sidebar-menu-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => onTabChange('config')}
          >
            <i className="bi bi-sliders"></i>
            <span>Configuración / Hardware</span>
          </button>

          <div className="sidebar-divider"></div>

          <button
            className={`sidebar-menu-btn ${activeTab === 'sdr' ? 'active' : ''}`}
            onClick={() => onTabChange('sdr')}
          >
            <i className="bi bi-cpu"></i>
            <span>Diagnóstico SDR</span>
          </button>

          <button
            className={`sidebar-menu-btn ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => onTabChange('docs')}
          >
            <i className="bi bi-question-circle"></i>
            <span>Documentación</span>
          </button>

          <div className="sidebar-divider"></div>

          {/* User Requested: Boton de Cerrar Sesión */}
          <button
            className="sidebar-menu-btn sidebar-logout-btn"
            onClick={onLogout}
            title="Cerrar sesión del sistema"
          >
            <i className="bi bi-box-arrow-left"></i>
            <span>Cerrar Sesión</span>
          </button>
        </nav>
      </div>

      {/* Bottom Buffer FIFO Meter or SDR Storage */}
      <div className="sidebar-footer-box">
        {activeTab === 'history' ? (
          <>
            <div className="buffer-header">
              <span>ALMACENAMIENTO SDR</span>
              <span className="buffer-val" style={{ color: '#38bdf8' }}>64.2%</span>
            </div>
            <div className="buffer-progress-bar">
              <div
                className="buffer-progress-fill"
                style={{ width: '64.2%', background: 'linear-gradient(90deg, #06b6d4, #10b981)' }}
              ></div>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
              541.8 GB / 512 GB SSD NVMe
            </div>
          </>
        ) : (
          <>
            <div className="buffer-header">
              <span>BUFFER FIFO</span>
              <span className="buffer-val">1.2 MB / 8 MB</span>
            </div>
            <div className="buffer-progress-bar">
              <div className="buffer-progress-fill"></div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
