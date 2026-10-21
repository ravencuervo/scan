import React from 'react';
import type { User } from '../types/spectrum';
import './HeaderBar.css';

interface HeaderBarProps {
  user: User | null;
  engineType: string;
  isLive: boolean;
  captureMode: 'demo' | 'real';
  activeTab?: string;
  onModeChange: (mode: 'demo' | 'real') => void;
  onLogout: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  user,
  engineType,
  captureMode,
  activeTab = 'live',
  onModeChange,
  onLogout,
}) => {
  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <span>AeroScan</span>
            <span className="bc-sub">/</span>
            <span className="bc-sub">Dashboard Principal</span>
            <span className="header-sim-badge">DATOS SIMULADOS</span>
          </>
        );
      case 'channels':
        return (
          <>
            <span>AeroScan</span>
            <span className="bc-sub">/</span>
            <span className="bc-sub">Modo: Análisis de Espectro 2.4/5 GHz</span>
          </>
        );
      case 'history':
        return (
          <>
            <span>Historial de Auditoría Espectral</span>
            <span className="bc-sub">/</span>
            <span className="bc-sub">SES-DIFF-ENGINE</span>
          </>
        );
      case 'reports':
        return (
          <>
            <span>Informe Técnico de Espectro RF</span>
            <span className="bc-sub">-</span>
            <span className="bc-sub">Sesión #SES-2025-0512-B</span>
          </>
        );
      case 'live':
      default:
        return (
          <>
            <span>AeroScan</span>
            <span className="bc-sub">/</span>
            <span className="bc-sub">Captura en Vivo</span>
          </>
        );
    }
  };

  return (
    <header className="app-header-bar">
      <div className="header-left-breadcrumbs">
        <div className="header-breadcrumb-title">
          {getBreadcrumbTitle()}
        </div>

        <div className="header-mode-toggle">
          <button
            className={`header-mode-btn ${captureMode === 'demo' ? 'active' : ''}`}
            onClick={() => onModeChange('demo')}
          >
            DEMOSTRACION
          </button>
          <button
            className={`header-mode-btn ${captureMode === 'real' ? 'active' : ''}`}
            onClick={() => onModeChange('real')}
          >
            CAPTURA REAL ●
          </button>
        </div>
      </div>

      <div className="header-right-actions">
        <div className="header-status-badge">
          <span className="header-status-dot"></span>
          <span>SDR: {engineType.toUpperCase()} Conectado</span>
        </div>

        <div className="header-fft-badge">
          <span>1000ms FFT</span>
        </div>

        <button className="header-icon-btn" title="Notificaciones del sistema">
          <i className="bi bi-bell"></i>
        </button>

        <button className="header-icon-btn" title="Configuración rápida">
          <i className="bi bi-gear"></i>
        </button>

        {user && (
          <div className="header-user-profile" title={`Usuario: ${user.full_name || user.username}`}>
            <div className="header-user-avatar">
              <i className="bi bi-person-fill"></i>
            </div>
            <span className="header-user-name">{user.full_name || user.username}</span>
          </div>
        )}

        {/* User Requested: Boton de Cerrar Sesión en el panel */}
        <button
          className="header-logout-btn"
          onClick={onLogout}
          title="Cerrar sesión del sistema"
        >
          <i className="bi bi-box-arrow-right"></i>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </header>
  );
};
