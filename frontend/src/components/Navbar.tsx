import React from 'react';
import type { User } from '../types/spectrum';
import './Navbar.css';

interface NavbarProps {
  user: User | null;
  engineType: string;
  isLive: boolean;
  onLogout: () => void;
  onOpenNewSession: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  exportingPdf: boolean;
  exportingExcel: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  engineType,
  isLive,
  onLogout,
  onOpenNewSession,
  onExportPdf,
  onExportExcel,
  exportingPdf,
  exportingExcel,
}) => {
  return (
    <header className="navbar">
      <div className="brand">
        <div className="brand-logo-wrap">
          <img
            src="/images/logos/logo.svg"
            alt="AeroScan Logo"
            className="brand-logo-img"
          />
        </div>
        <div className="brand-text">
          <h1>
            AeroScan{' '}
            <span className="brand-version-badge">
              v1.0 (React + 3D)
            </span>
          </h1>
          <p>Análisis Espectral • Diagnóstico de Redes WiFi</p>
        </div>
      </div>

      <div className="nav-actions">
        <div className={`badge ${isLive ? 'badge-live' : 'badge-engine'}`}>
          {isLive && <span className="pulse-dot"></span>}
          <span>{isLive ? 'EN VIVO' : 'CONECTANDO...'}</span>
        </div>

        <div className="badge badge-engine">
          <i className="bi bi-cpu" style={{ color: 'var(--color5)' }}></i>
          <span>MOTOR: {engineType.toUpperCase()}</span>
        </div>

        {user && (
          <div className="user-profile-badge">
            <i className="bi bi-person-fill" style={{ color: 'var(--color5)' }}></i>
            <span>{user.full_name || user.username}</span>
            <button className="btn-logout" onClick={onLogout} title="Cerrar Sesión">
              <i className="bi bi-box-arrow-right"></i> Salir
            </button>
          </div>
        )}

        <button className="btn btn-secondary" onClick={onOpenNewSession}>
          <i className="bi bi-plus-circle" style={{ color: 'var(--color5)' }}></i>
          <span>Nueva Auditoría</span>
        </button>

        <button
          className="btn btn-export-pdf"
          onClick={onExportPdf}
          disabled={exportingPdf}
        >
          <i className="bi bi-file-earmark-pdf"></i>
          <span>{exportingPdf ? 'Generando PDF...' : 'Exportar PDF'}</span>
        </button>

        <button
          className="btn btn-export-excel"
          onClick={onExportExcel}
          disabled={exportingExcel}
        >
          <i className="bi bi-file-earmark-excel" style={{ color: 'var(--color5)' }}></i>
          <span>{exportingExcel ? 'Generando Excel...' : 'Exportar Excel'}</span>
        </button>
      </div>
    </header>
  );
};
