import React, { useState, useEffect } from 'react';
import './CaptureControlBar.css';

interface CaptureControlBarProps {
  engineType: string;
  isCapturing: boolean;
  totalAps: number;
  onToggleCapture: () => void;
  onExportReports: () => void;
}

export const CaptureControlBar: React.FC<CaptureControlBarProps> = ({
  engineType,
  isCapturing,
  totalAps,
  onToggleCapture,
  onExportReports,
}) => {
  const [band24, setBand24] = useState(true);
  const [band5, setBand5] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(878); // 14:38 demo start

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

  return (
    <div className="capture-control-card">
      {/* Top Row: Adapter & Hardware info */}
      <div className="control-row-top">
        <div className="adapter-info-group">
          <div className="adapter-item">
            <span className="adapter-item-label">ADAPTADOR ACTUAL</span>
            <span className="adapter-item-val">
              <i className="bi bi-usb-symbol"></i>
              {engineType === 'windows'
                ? 'Controlador Nativo Windows (Hardware Interno 802.11)'
                : 'Alfa Network AWUS036ACH (Chipset Realtek RTL8812AU)'}
            </span>
          </div>

          <div className="adapter-item">
            <span className="adapter-item-label">MODO RF INTERFAZ</span>
            <span className="adapter-item-val">
              <span className="adapter-dot-green"></span>
              Monitor RF Activo (Permisos validados)
            </span>
          </div>
        </div>

        <div className="session-stats-group">
          <div className="session-stat-item">
            <i className="bi bi-clock"></i>
            <span>SESIÓN: {formatTime(secondsElapsed)} {isCapturing ? 'en curso' : 'pausada'}</span>
          </div>

          <div className="session-stat-item">
            <i className="bi bi-layers"></i>
            <span>PAQUETES: {packetCount.toLocaleString()} frames beacon/probe</span>
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

          <button className="btn-tactical-export" onClick={onExportReports}>
            <i className="bi bi-box-arrow-down"></i>
            <span>EXPORTAR VOLCADO PCAP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
