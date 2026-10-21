import React, { useState, useEffect } from 'react';
import type { WirelessAdapter } from '../types/spectrum';
import './ConfigView.css';

interface ConfigViewProps {
  adapters: WirelessAdapter[];
  selectedAdapter: string;
  onSelectAdapter: (adapterId: string) => void;
}

export const ConfigView: React.FC<ConfigViewProps> = ({
  adapters,
  selectedAdapter,
  onSelectAdapter,
}) => {
  const [currentAdapter, setCurrentAdapter] = useState(selectedAdapter);
  const [scanInterval, setScanInterval] = useState(2.0);
  const [dwellTime, setDwellTime] = useState(100);
  const [noiseFloor, setNoiseFloor] = useState(-95);
  const [enable24, setEnable24] = useState(true);
  const [enable5, setEnable5] = useState(true);
  const [enable6, setEnable6] = useState(false);
  const [criticalRssi, setCriticalRssi] = useState(-80);
  const [maxCongestion, setMaxCongestion] = useState(3);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    setCurrentAdapter(selectedAdapter);
  }, [selectedAdapter]);

  useEffect(() => {
    // Fetch live config from server
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.scan_interval) setScanInterval(data.scan_interval);
        if (data.dwell_time_ms) setDwellTime(data.dwell_time_ms);
        if (data.noise_floor_dbm) setNoiseFloor(data.noise_floor_dbm);
        if (data.enable_24ghz !== undefined) setEnable24(data.enable_24ghz);
        if (data.enable_5ghz !== undefined) setEnable5(data.enable_5ghz);
        if (data.enable_6ghz !== undefined) setEnable6(data.enable_6ghz);
        if (data.critical_rssi_threshold) setCriticalRssi(data.critical_rssi_threshold);
        if (data.max_ap_congestion) setMaxCongestion(data.max_ap_congestion);
      })
      .catch((err) => console.warn('Could not fetch server config:', err));

    // Fetch system info
    fetch('/api/system/info')
      .then((res) => res.json())
      .then((data) => setSystemInfo(data))
      .catch((err) => console.warn('Could not fetch system info:', err));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        selected_adapter: currentAdapter,
        scan_interval: scanInterval,
        dwell_time_ms: dwellTime,
        noise_floor_dbm: noiseFloor,
        enable_24ghz: enable24,
        enable_5ghz: enable5,
        enable_6ghz: enable6,
        critical_rssi_threshold: criticalRssi,
        max_ap_congestion: maxCongestion,
      };

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSelectAdapter(currentAdapter);
        setShowSavedToast(true);
        setTimeout(() => setShowSavedToast(false), 4000);
      }
    } catch (err) {
      console.error('Error saving configuration:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setScanInterval(2.0);
    setDwellTime(100);
    setNoiseFloor(-95);
    setEnable24(true);
    setEnable5(true);
    setEnable6(false);
    setCriticalRssi(-80);
    setMaxCongestion(3);
    setCurrentAdapter('ALL');
  };

  return (
    <div className="config-view-container">
      {/* 1. Header Bar */}
      <div className="config-header-card">
        <div className="config-header-title">
          <i className="bi bi-sliders"></i>
          <div>
            <h2>Configuración del Sistema y Módulos de Hardware</h2>
            <p>
              Ajuste de parámetros de transceptores RF, umbrales de detección y base de datos local
            </p>
          </div>
        </div>

        <div className="config-actions-top">
          <button className="btn-config-reset" onClick={handleResetDefaults}>
            <i className="bi bi-arrow-counterclockwise"></i> Valores Predeterminados
          </button>
          <button className="btn-config-save" onClick={handleSave} disabled={isSaving}>
            <i className="bi bi-check-circle-fill"></i>
            {isSaving ? 'Guardando...' : 'GUARDAR CONFIGURACIÓN'}
          </button>
        </div>
      </div>

      {showSavedToast && (
        <div className="config-toast-success">
          <i className="bi bi-check-circle-fill"></i>
          <span>
            Configuración guardada y sincronizada correctamente con los transceptores de hardware.
          </span>
        </div>
      )}

      {/* 2. Main Config Grid */}
      <div className="config-grid">
        {/* Card 1: Transceptores y Módulos WiFi */}
        <div className="config-card">
          <div className="config-card-header">
            <div className="config-card-title">
              <i className="bi bi-hdd-network"></i>
              <span>Módulos de Hardware Wi-Fi Físicos</span>
            </div>
            <span className="config-card-badge">
              {adapters.length === 1 ? '1 Transceptor' : `${adapters.length} Transceptores`}
            </span>
          </div>

          <div className="config-form-group">
            <label className="config-label">
              <span>Transceptor Activo para Escaneo</span>
              <span className="config-subtext">Selecciona módulo dedicado o multi-sensor</span>
            </label>
            <select
              className="config-select"
              value={currentAdapter}
              onChange={(e) => setCurrentAdapter(e.target.value)}
            >
              {adapters.length > 1 && (
                <option value="ALL">
                  TODOS LOS MÓDULOS ({adapters.length} en Paralelo / Multi-Sensor)
                </option>
              )}
              {adapters.map((ad) => (
                <option key={ad.id} value={ad.id}>
                  {ad.name} — {ad.description} [{ad.mac_address || 'Sin MAC'}]
                </option>
              ))}
              {adapters.length === 0 && <option value="ALL">Controlador WLAN Windows</option>}
            </select>
          </div>

          <div className="config-form-group">
            <span className="config-label">Detalles del Hardware Enumerado</span>
            <div
              style={{
                backgroundColor: 'var(--color1)',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {adapters.map((ad) => (
                <div
                  key={ad.id}
                  style={{
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ color: 'var(--color6)', fontWeight: 600 }}>{ad.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{ad.mac_address || 'MAC N/A'}</span>
                  <span style={{ color: '#10b981' }}>{ad.status.toUpperCase()}</span>
                </div>
              ))}
              {adapters.length === 0 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Buscando dispositivos físicos conectados...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Parámetros del Motor de Captura RF */}
        <div className="config-card">
          <div className="config-card-header">
            <div className="config-card-title">
              <i className="bi bi-broadcast-pin"></i>
              <span>Parámetros del Motor de Captura RF</span>
            </div>
            <span className="config-card-badge">TIEMPO REAL</span>
          </div>

          <div className="config-form-group">
            <label className="config-label">
              <span>Intervalo de Muestreo de Hardware</span>
              <span className="config-slider-val">{scanInterval.toFixed(1)} segundos</span>
            </label>
            <div className="config-range-wrap">
              <input
                type="range"
                className="config-slider"
                min="0.5"
                max="5.0"
                step="0.5"
                value={scanInterval}
                onChange={(e) => setScanInterval(parseFloat(e.target.value))}
              />
            </div>
            <span className="config-subtext">Frecuencia de sondeo a través de la API nativa WLAN</span>
          </div>

          <div className="config-form-group">
            <label className="config-label">
              <span>Dwell Time por Canal (Tiempo de permanencia)</span>
              <span className="config-slider-val">{dwellTime} ms</span>
            </label>
            <div className="config-range-wrap">
              <input
                type="range"
                className="config-slider"
                min="50"
                max="300"
                step="25"
                value={dwellTime}
                onChange={(e) => setDwellTime(parseInt(e.target.value, 10))}
              />
            </div>
            <span className="config-subtext">
              Tiempo en milisegundos dedicado a escuchar beacons en cada canal
            </span>
          </div>

          <div className="config-form-group">
            <label className="config-label">
              <span>Calibración de Piso de Ruido Espectral</span>
              <span className="config-slider-val">{noiseFloor} dBm</span>
            </label>
            <div className="config-range-wrap">
              <input
                type="range"
                className="config-slider"
                min="-105"
                max="-75"
                step="1"
                value={noiseFloor}
                onChange={(e) => setNoiseFloor(parseInt(e.target.value, 10))}
              />
            </div>
            <span className="config-subtext">Nivel base de ruido electromagnético ambiental</span>
          </div>
        </div>

        {/* Card 3: Bandas de Frecuencia y Filtros */}
        <div className="config-card">
          <div className="config-card-header">
            <div className="config-card-title">
              <i className="bi bi-filter-circle"></i>
              <span>Bandas de Frecuencia Habilitadas</span>
            </div>
            <span className="config-card-badge">FILTRADO RF</span>
          </div>

          <div className="config-form-group">
            <span className="config-label">Selección de Bandas para Monitoreo</span>
            <div className="config-checkbox-group">
              <label className="config-checkbox-label">
                <input
                  type="checkbox"
                  checked={enable24}
                  onChange={(e) => setEnable24(e.target.checked)}
                />
                <span>Banda 2.4 GHz (Canales 1 al 14)</span>
              </label>

              <label className="config-checkbox-label">
                <input
                  type="checkbox"
                  checked={enable5}
                  onChange={(e) => setEnable5(e.target.checked)}
                />
                <span>Banda 5 GHz UNII-1/2/3 (Canales 36 al 165)</span>
              </label>

              <label className="config-checkbox-label">
                <input
                  type="checkbox"
                  checked={enable6}
                  onChange={(e) => setEnable6(e.target.checked)}
                />
                <span>Banda 6 GHz (Wi-Fi 6E / Wi-Fi 7)</span>
              </label>
            </div>
          </div>

          <div className="config-form-group" style={{ marginTop: '8px' }}>
            <label className="config-label">
              <span>Umbral de Señal Crítica (Baja Potencia)</span>
              <span className="config-slider-val">{criticalRssi} dBm</span>
            </label>
            <div className="config-range-wrap">
              <input
                type="range"
                className="config-slider"
                min="-90"
                max="-60"
                step="2"
                value={criticalRssi}
                onChange={(e) => setCriticalRssi(parseInt(e.target.value, 10))}
              />
            </div>
            <span className="config-subtext">
              Puntos de acceso por debajo de este valor se clasificarán como señal deficiente
            </span>
          </div>

          <div className="config-form-group">
            <label className="config-label">
              <span>Límite de Congestión Máxima por Canal</span>
              <span className="config-slider-val">&gt; {maxCongestion} APs</span>
            </label>
            <div className="config-range-wrap">
              <input
                type="range"
                className="config-slider"
                min="2"
                max="8"
                step="1"
                value={maxCongestion}
                onChange={(e) => setMaxCongestion(parseInt(e.target.value, 10))}
              />
            </div>
            <span className="config-subtext">
              Canales con más puntos de acceso activarán alertas críticas de contienda CSMA/CA
            </span>
          </div>
        </div>

        {/* Card 4: Base de Datos y Telemetría del Sistema */}
        <div className="config-card">
          <div className="config-card-header">
            <div className="config-card-title">
              <i className="bi bi-database-check"></i>
              <span>Almacenamiento Local y Telemetría del Sistema</span>
            </div>
            <span className="config-card-badge">SQLITE WAL</span>
          </div>

          <div className="config-form-group">
            <span className="config-label">Información de la Plataforma</span>
            <div
              style={{
                backgroundColor: 'var(--color1)',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid var(--color3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Sistema Operativo:</span>
                <span style={{ color: 'var(--color6)' }}>{systemInfo?.platform || 'Windows Native'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Entorno Python:</span>
                <span style={{ color: 'var(--color6)' }}>Python {systemInfo?.python_version || '3.11+'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Archivo de Base de Datos:</span>
                <span style={{ color: '#38bdf8' }}>scan.db (Modo WAL)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Tamaño en Disco:</span>
                <span style={{ color: 'var(--color6)' }}>{systemInfo?.db_size_formatted || '1.8 MB'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Sesión Activa:</span>
                <span style={{ color: '#10b981' }}>#{systemInfo?.active_session_id || 1} en ejecución</span>
              </div>
            </div>
          </div>

          <div className="config-form-group" style={{ marginTop: '6px' }}>
            <span className="config-label">Acciones de Mantenimiento</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-config-reset"
                style={{ flex: 1 }}
                onClick={() => {
                  fetch('/api/system/info')
                    .then((r) => r.json())
                    .then((d) => setSystemInfo(d));
                }}
              >
                <i className="bi bi-arrow-repeat"></i> Actualizar Métricas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigView;
