import React from 'react';
import './SdrTelemetryPanel.css';

interface SdrTelemetryPanelProps {
  onSaveFrame: () => void;
}

export const SdrTelemetryPanel: React.FC<SdrTelemetryPanelProps> = ({ onSaveFrame }) => {
  return (
    <div className="sdr-telemetry-panel">
      {/* 1. Estado del Motor SDR */}
      <div className="sdr-card">
        <div className="sdr-card-header">
          <div className="sdr-card-title">
            <i className="bi bi-cpu-fill"></i>
            <span>Estado del Motor SDR</span>
          </div>
          <span className="badge-online">ONLINE</span>
        </div>

        <div className="sdr-metrics-table">
          <div className="sdr-metric-row">
            <span className="sdr-metric-key">Procesamiento FFT:</span>
            <span className="sdr-metric-val">40 MHz en tiempo real</span>
          </div>

          <div className="sdr-metric-row">
            <span className="sdr-metric-key">Tasa de Muestreo I/Q:</span>
            <span className="sdr-metric-val">2.4 MSPS sincrónico</span>
          </div>

          <div className="sdr-metric-row">
            <span className="sdr-metric-key">Sensibilidad RF:</span>
            <span className="sdr-metric-val">-96 dBm ± 0.5</span>
          </div>

          <div className="sdr-metric-row">
            <span className="sdr-metric-key">Temperatura Dongle:</span>
            <span className="sdr-metric-val">41.8 °C (Estable)</span>
          </div>
        </div>
      </div>

      {/* 2. Telemetría y Tolerancias */}
      <div className="sdr-card">
        <div className="sdr-card-header">
          <div className="sdr-card-title">
            <i className="bi bi-shield-check"></i>
            <span>TELEMETRÍA Y TOLERANCIAS</span>
          </div>
          <i className="bi bi-check-circle-fill" style={{ color: '#10b981' }}></i>
        </div>

        <div className="tolerances-list">
          <div className="tolerance-item">
            <div className="tolerance-icon-wrap">
              <i className="bi bi-check2"></i>
            </div>
            <div className="tolerance-content">
              <span className="tolerance-title">Adaptador 100% compatible</span>
              <span className="tolerance-sub">Firmware RTL8812AU v5.6.4.2 inyección activada</span>
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
