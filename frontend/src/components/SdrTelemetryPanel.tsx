import React from 'react';
import type { WirelessAdapter } from '../types/spectrum';
import './SdrTelemetryPanel.css';

interface SdrTelemetryPanelProps {
  adapters?: WirelessAdapter[];
  selectedAdapter?: string;
  onSaveFrame: () => void;
}

export const SdrTelemetryPanel: React.FC<SdrTelemetryPanelProps> = ({
  adapters = [],
  selectedAdapter = 'ALL',
  onSaveFrame,
}) => {
  return (
    <div className="sdr-telemetry-panel">
      {/* 1. Módulos Wi-Fi Físicos Detectados */}
      <div className="sdr-card">
        <div className="sdr-card-header">
          <div className="sdr-card-title">
            <i className="bi bi-hdd-network-fill"></i>
            <span>Módulos de Hardware ({adapters.length})</span>
          </div>
          <span className="badge-online">
            {adapters.length === 1 ? '1 MÓDULO' : `${adapters.length} MÓDULOS`}
          </span>
        </div>

        <div className="sdr-metrics-table">
          {adapters.length === 0 ? (
            <div className="sdr-metric-row">
              <span className="sdr-metric-key">Estado:</span>
              <span className="sdr-metric-val">Buscando transceptores...</span>
            </div>
          ) : (
            adapters.map((ad, idx) => (
              <div
                key={ad.id}
                style={{
                  borderBottom: idx < adapters.length - 1 ? '1px solid rgba(88, 51, 131, 0.3)' : 'none',
                  paddingBottom: '8px',
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color6)', fontSize: '0.8rem' }}>
                    <i className="bi bi-wifi" style={{ marginRight: '6px', color: 'inherit' }}></i>
                    {ad.name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontFamily: 'var(--font-mono)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'var(--color6)',
                    }}
                  >
                    {ad.status === 'connected' ? 'CONECTADO' : 'LIBRE / ESCANEO'}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {ad.description}
                </div>
                <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginTop: '2px' }}>
                  MAC: {ad.mac_address || 'N/A'} {ad.connected_ssid && `• SSID: ${ad.connected_ssid} (Ch ${ad.current_channel || '?'})`}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Telemetría y Tolerancias */}
      <div className="sdr-card">
        <div className="sdr-card-header">
          <div className="sdr-card-title">
            <i className="bi bi-shield-check" style={{ color: 'inherit' }}></i>
            <span>TELEMETRÍA Y TOLERANCIAS</span>
          </div>
          <i className="bi bi-check-circle" style={{ color: 'inherit' }}></i>
        </div>

        <div className="tolerances-list">
          <div className="tolerance-item">
            <div className="tolerance-icon-wrap">
              <i className="bi bi-check2"></i>
            </div>
            <div className="tolerance-content">
              <span className="tolerance-title">
                {selectedAdapter === 'ALL'
                  ? `Modo Multi-Sensor (${adapters.length} transceptores activos)`
                  : `Transceptor dedicado: ${selectedAdapter}`}
              </span>
              <span className="tolerance-sub">Enumeración WLAN nativa y agregación multi-antena</span>
            </div>
          </div>

          <div className="tolerance-item">
            <div className="tolerance-icon-wrap">
              <i className="bi bi-hdd-stack"></i>
            </div>
            <div className="tolerance-content">
              <span className="tolerance-title">0 colisiones en buffer FIFO</span>
              <span className="tolerance-sub">Tasa de descarte de paquetes: 0.00%</span>
            </div>
          </div>

          <div className="tolerance-item">
            <div className="tolerance-icon-wrap">
              <i className="bi bi-speedometer2"></i>
            </div>
            <div className="tolerance-content">
              <span className="tolerance-title">Latencia de captura: 4.2 ms</span>
              <span className="tolerance-sub">Jitter de sondeo: ± 0.3ms (Rango óptimo)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Captura instantánea FFT */}
      <div className="snapshot-card">
        <div className="snapshot-title">
          <i className="bi bi-camera-fill"></i>
          <span>Captura instantánea FFT</span>
        </div>
        <button className="btn-snapshot-save" onClick={onSaveFrame}>
          GUARDAR FRAME
        </button>
      </div>
    </div>
  );
};
