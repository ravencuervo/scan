import React from 'react';
import type { User } from '../types/spectrum';
import './HeaderBar.css';

interface HeaderBarProps {
  user: User | null;
  engineType: string;
  isLive: boolean;
  activeTab?: string;
  onLogout: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  user,
  engineType,
  isLive,
  activeTab = 'live',
  onLogout,
}) => {
  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <span>AeroScan</span>
            <span className="bc-sub">/</span>
            <span className="bc-sub">Dashboard de Espectro en Vivo</span>
          </>
        );
      case 'channels':
        return (
          <>
            <span>AeroScan</span>
            <span className="bc-sub">/</span>
            <span className="bc-sub">Análisis de Espectro 2.4 / 5 GHz</span>
          </>
        );
      case 'history':
        return (
          <>
            <span>AeroScan</span>
            <span className="bc-sub">/</span>
            <span className="bc-sub">Historial de Auditorías Reales</span>
          </>
        );
      case 'reports':
        return (
          <>
            <span>AeroScan</span>
            <span className="bc-sub">/</span>
            <span className="bc-sub">Informes Técnicos de Ingeniería RF</span>
          </>
        );
      case 'live':
      default:
        return (
          <>
            <span>AeroScan</span>
            <span className="bc-sub">/</span>
            <span className="bc-sub">Captura en Vivo Multi-Antena</span>
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

        <div className="header-hardware-live-tag">
          <i className="bi bi-hdd-network"></i>
          <span>HARDWARE REAL CONECTADO</span>
        </div>
      </div>

      <div className="header-right-actions">
        <div className="header-status-badge">
          <span className="header-status-dot" style={{ backgroundColor: isLive ? '#10b981' : '#f59e0b' }}></span>
          <span>SDR: {engineType.toUpperCase()} {isLive ? 'En Línea' : 'Sincronizando...'}</span>
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
