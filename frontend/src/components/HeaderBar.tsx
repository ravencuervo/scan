import React from 'react';
import type { User } from '../types/spectrum';
import './HeaderBar.css';

interface HeaderBarProps {
  user: User | null;
  engineType: string;
  isLive: boolean;
  activeTab?: string;
  onLogout: () => void;
  onNavigate?: (tab: string) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  user,
  engineType,
  isLive,
  activeTab = 'live',
  onLogout,
  onNavigate,
}) => {
  const [showNotifications, setShowNotifications] = React.useState(false);

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
      case 'config':
        return (
          <>
            <span>AeroScan</span>
            <span className="bc-sub">/</span>
            <span className="bc-sub">Configuración del Sistema y Hardware</span>
          </>
        );
      case 'sdr':
        return (
          <>
            <span>AeroScan</span>
            <span className="bc-sub">/</span>
            <span className="bc-sub">Diagnóstico SDR y Transceptores</span>
          </>
        );
      case 'docs':
        return (
          <>
            <span>AeroScan</span>
            <span className="bc-sub">/</span>
            <span className="bc-sub">Documentación y Manual Técnico</span>
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
    <header className="app-header-bar" style={{ position: 'relative' }}>
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
          <span>60 FPS FFT</span>
        </div>

        <button
          className="header-icon-btn"
          title="Notificaciones del sistema"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <i className="bi bi-bell"></i>
        </button>

        <button
          className="header-icon-btn"
          title="Configuración de hardware"
          onClick={() => onNavigate?.('config')}
        >
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

      {showNotifications && (
        <div
          style={{
            position: 'absolute',
            top: '55px',
            right: '20px',
            width: '320px',
            backgroundColor: 'var(--color2)',
            border: '1px solid var(--color4)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 1000,
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(88, 51, 131, 0.3)', paddingBottom: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color6)' }}>
              <i className="bi bi-bell-fill" style={{ marginRight: '6px', color: '#06b6d4' }}></i>
              Notificaciones del Sistema
            </span>
            <button
              onClick={() => setShowNotifications(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ padding: '6px', backgroundColor: 'var(--color1)', borderRadius: '4px', borderLeft: '3px solid #10b981' }}>
              <strong style={{ color: 'var(--color6)' }}>Hardware Sincronizado:</strong> Transceptores Wi-Fi operando en tiempo real.
            </div>
            <div style={{ padding: '6px', backgroundColor: 'var(--color1)', borderRadius: '4px', borderLeft: '3px solid #38bdf8' }}>
              <strong style={{ color: 'var(--color6)' }}>Base de Datos Activa:</strong> Grabación de tramas en SQLite WAL activa.
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
