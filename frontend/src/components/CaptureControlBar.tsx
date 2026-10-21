import React, { useState, useEffect } from 'react';
import type { WirelessAdapter } from '../types/spectrum';
import './CaptureControlBar.css';

interface CaptureControlBarProps {
  engineType: string;
  isCapturing: boolean;
  totalAps: number;
  adapters?: WirelessAdapter[];
  selectedAdapter?: string;
  onSelectAdapter?: (adapterId: string) => void;
  onToggleCapture: () => void;
  onExportReports: () => void;
}

export const CaptureControlBar: React.FC<CaptureControlBarProps> = ({
  engineType: _engineType,
  isCapturing,
  totalAps,
  adapters = [],
  selectedAdapter = 'ALL',
  onSelectAdapter,
  onToggleCapture,
  onExportReports: _onExportReports,
}) => {
  const [band24, setBand24] = useState(true);
  const [band5, setBand5] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(878);

  useEffect(() => {
    if (!isCapturing || isPaused) return;
    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isCapturing, isPaused]);

  const formatTime = (totalSec: number) => {
    const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const packetCount = 84219 + (secondsElapsed - 878) * 142 + totalAps * 18;

  const currentActiveAdapter = adapters.find((a) => a.id === selectedAdapter);

  return (
    <div className="capture-control-card">
      {/* Top Row: Adapter & Hardware info */}
      <div className="control-row-top">
        <div className="adapter-info-group">
          {/* Hardware Module Selector */}
          <div className="adapter-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="adapter-item-label">MÓDULO DE HARDWARE WIFI</span>
              <span className="adapter-badge-count">
                {adapters.length === 0
                  ? 'BUSCANDO MÓDULOS...'
                  : adapters.length === 1
                  ? '1 MÓDULO DETECTADO'
                  : `${adapters.length} MÓDULOS DETECTADOS`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <i className="bi bi-hdd-network" style={{ fontSize: '1.05rem', color: 'inherit' }}></i>
              <select
                className="adapter-select-control"
                value={selectedAdapter}
                onChange={(e) => onSelectAdapter && onSelectAdapter(e.target.value)}
                title="Selecciona el módulo WiFi físico a utilizar o todos en paralelo"
              >
                {adapters.length > 1 && (
                  <option value="ALL">
                    TODOS LOS MÓDULOS ({adapters.length} en Paralelo / Multi-Sensor)
                  </option>
                )}
                {adapters.map((ad) => (
                  <option key={ad.id} value={ad.id}>
                    {ad.name} — {ad.description} [{ad.mac_address || 'Sin MAC'}]{' '}
                    {ad.connected_ssid ? `(Conectado a ${ad.connected_ssid})` : '(Modo Escaneo)'}
                  </option>
                ))}
                {adapters.length === 0 && (
                  <option value="ALL">Controlador Nativo Windows</option>
                )}
              </select>
            </div>
          </div>

          {/* Module telemetry status */}
          <div className="adapter-item">
            <span className="adapter-item-label">ESTADO DE HARDWARE</span>
            <div className="adapter-item-val">
              {selectedAdapter === 'ALL' ? (
                <>
                  <i className="bi bi-check2" style={{ color: 'inherit' }}></i>
                  <span style={{ fontWeight: 600 }}>Multi-Transceptor Activo:</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {adapters.map((a) => a.name).join(' + ') || 'Windows WLAN'}
                  </span>
                </>
              ) : currentActiveAdapter ? (
                <>
                  <i className="bi bi-check2" style={{ color: 'inherit' }}></i>
                  <span>{currentActiveAdapter.description}</span>
                  {currentActiveAdapter.connected_ssid && (
                    <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      [Enlace: {currentActiveAdapter.connected_ssid} • Ch {currentActiveAdapter.current_channel || '?'}]
                    </span>
                  )}
                  {currentActiveAdapter.mac_address && (
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                      ({currentActiveAdapter.mac_address})
                    </span>
                  )}
                </>
              ) : (
                <>
                  <i className="bi bi-check2" style={{ color: 'inherit' }}></i>
                  <span>Captura de Hardware Activa</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="session-stats-group">
          <div className="session-stat-item">
            <i className="bi bi-clock"></i>
            <span>SESIÓN: {formatTime(secondsElapsed)} {isCapturing ? 'en curso' : 'pausada'}</span>
          </div>

          <div className="session-stat-item">
            <i className="bi bi-layers"></i>
            <span>PAQUETES: {packetCount.toLocaleString()} frames</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Bands and Action buttons */}
      <div className="control-row-bottom">
        <div className="band-selector-group">
          <span className="band-label-txt">BANDAS:</span>

          <button
            className={`band-pill ${band24 ? 'active' : ''}`}
            onClick={() => setBand24(!band24)}
          >
            <span className="band-pill-dot"></span>
            2.4 GHz: {band24 ? 'ACTIVO' : 'INACTIVO'}
          </button>

          <button
            className={`band-pill ${band5 ? 'active' : ''}`}
            onClick={() => setBand5(!band5)}
          >
            <span className="band-pill-dot"></span>
            5 GHz: {band5 ? 'ACTIVO' : 'INACTIVO'}
          </button>

          <div className="band-pill inactive">
            <span className="band-pill-dot" style={{ backgroundColor: '#64748b' }}></span>
            6 GHz (WiFi 6E): INACTIVO
          </div>

          <div className="dwell-time-box">
            <span>DWELL TIME:</span>
            <span className="dwell-badge">100 ms</span>
            <span>(Tiempo por canal)</span>
          </div>
        </div>

        <div className="action-buttons-group">
          <button className="btn-tactical-stop" onClick={onToggleCapture}>
            <i className={`bi ${isCapturing ? 'bi-stop-fill' : 'bi-play-fill'}`}></i>
            <span>{isCapturing ? 'DETENER CAPTURA' : 'INICIAR CAPTURA'}</span>
          </button>

          <button
            className="btn-tactical-pause"
            onClick={() => setIsPaused(!isPaused)}
          >
            <i className={`bi ${isPaused ? 'bi-play-fill' : 'bi-pause-fill'}`}></i>
            <span>{isPaused ? 'REANUDAR BUFFER' : 'PAUSAR BUFFER'}</span>
          </button>

          <button
            className="btn-tactical-export"
            onClick={() => {
              window.location.href = '/api/export/pcap';
            }}
            title="Descargar volcado estructurado de tramas RF capturadas"
          >
            <i className="bi bi-box-arrow-down"></i>
            <span>EXPORTAR VOLCADO PCAP / JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};
