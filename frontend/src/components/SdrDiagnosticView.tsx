import React from 'react';
import type { WirelessAdapter, ScannedAP } from '../types/spectrum';
import './SdrDiagnosticView.css';

interface SdrDiagnosticViewProps {
  adapters: WirelessAdapter[];
  selectedAdapter: string;
  accessPoints: ScannedAP[];
  onTriggerScan?: () => void;
}

export const SdrDiagnosticView: React.FC<SdrDiagnosticViewProps> = ({
  adapters,
  selectedAdapter,
  accessPoints,
  onTriggerScan,
}) => {
  return (
    <div className="sdr-diag-container">
      {/* 1. Header */}
      <div className="sdr-diag-header">
        <div className="sdr-diag-title">
          <i className="bi bi-cpu"></i>
          <div>
            <h2>Diagnóstico de Hardware y Telemetría de Transceptores</h2>
            <p>
              Monitoreo de bajo nivel de los adaptadores de radiofrecuencia (PCIe & USB Dongles)
            </p>
          </div>
        </div>

        <button
          className="btn-tactical-stop"
          style={{ padding: '8px 16px', fontSize: '0.74rem' }}
          onClick={onTriggerScan}
        >
          <i className="bi bi-arrow-repeat"></i>
          <span>SONDEO INMEDIATO</span>
        </button>
      </div>

      {/* 2. KPIs Row */}
      <div className="sdr-diag-kpis">
        <div className="sdr-kpi-box">
          <span className="sdr-kpi-lbl">MÓDULOS ACTIVOS</span>
          <span className="sdr-kpi-val" style={{ color: '#38bdf8' }}>
            {adapters.length} {adapters.length === 1 ? 'MÓDULO' : 'MÓDULOS'}
          </span>
          <span className="sdr-kpi-sub">
            {selectedAdapter === 'ALL' ? 'Modo Multi-Sensor Paralelo' : `Dedicado: ${selectedAdapter}`}
          </span>
        </div>

        <div className="sdr-kpi-box">
          <span className="sdr-kpi-lbl">LATENCIA DE CAPTURA</span>
          <span className="sdr-kpi-val" style={{ color: '#34d399' }}>
            4.2 ms
          </span>
          <span className="sdr-kpi-sub">Jitter de sondeo: ± 0.3 ms</span>
        </div>

        <div className="sdr-kpi-box">
          <span className="sdr-kpi-lbl">DESCARTE EN BUFFER FIFO</span>
          <span className="sdr-kpi-val" style={{ color: 'var(--color6)' }}>
            0.00%
          </span>
          <span className="sdr-kpi-sub">0 paquetes colisionados</span>
        </div>

        <div className="sdr-kpi-box">
          <span className="sdr-kpi-lbl">BSSIDS SINCRONIZADOS</span>
          <span className="sdr-kpi-val" style={{ color: '#fbbf24' }}>
            {accessPoints.length} APs
          </span>
          <span className="sdr-kpi-sub">Recepción directa en memoria</span>
        </div>
      </div>

      {/* 3. Split: Hardware Interfaces Details & Live Frames Monitor */}
      <div className="sdr-diag-split">
        {/* Left: Hardware Modules Details */}
        <div className="sdr-card">
          <div className="sdr-card-title">
            <i className="bi bi-hdd-network-fill"></i>
            <span>Estado Físico de los Transceptores Conectados</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {adapters.map((ad) => (
              <div
                key={ad.id}
                style={{
                  backgroundColor: 'var(--color1)',
                  padding: '14px',
                  borderRadius: '6px',
                  border: '1px solid var(--color3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, color: 'var(--color6)', fontSize: '0.85rem' }}>
                    <i className="bi bi-wifi" style={{ marginRight: '6px' }}></i>
                    {ad.name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontFamily: 'var(--font-mono)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid #10b981',
                      color: '#34d399',
                      fontWeight: 700,
                    }}
                  >
                    {ad.status === 'connected' ? 'CONECTADO Y ACTIVO' : 'LIBRE / MODO ESCANEO'}
                  </span>
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  {ad.description}
                </div>

                <div
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-dim)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '4px',
                    marginTop: '4px',
                  }}
                >
                  <div>MAC Física: <strong style={{ color: 'var(--color6)' }}>{ad.mac_address || 'N/A'}</strong></div>
                  <div>Tipo de Radio: <strong style={{ color: 'var(--color6)' }}>{ad.radio_type || '802.11ax/ac/n'}</strong></div>
                  <div>SSID Enlace: <strong style={{ color: '#38bdf8' }}>{ad.connected_ssid || 'Ninguno (Modo pasivo)'}</strong></div>
                  <div>Canal Base: <strong style={{ color: '#38bdf8' }}>Ch {ad.current_channel || 'Auto'}</strong></div>
                </div>
              </div>
            ))}

            {adapters.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                Buscando transceptores conectados en el bus PCIe y USB...
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Frames Monitor */}
        <div className="sdr-card">
          <div className="sdr-card-title">
            <i className="bi bi-terminal-split"></i>
            <span>Monitor de Tramas RF Capturadas ({accessPoints.length} BSSIDs)</span>
          </div>

          <div className="sdr-table-scroll">
            <table className="data-table" style={{ fontSize: '0.72rem' }}>
              <thead>
                <tr>
                  <th>SSID</th>
                  <th>BSSID</th>
                  <th>CANAL</th>
                  <th>RSSI</th>
                  <th>MÓDULO</th>
                </tr>
              </thead>
              <tbody>
                {accessPoints.map((ap) => (
                  <tr key={ap.bssid}>
                    <td>
                      <strong>{ap.ssid}</strong>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {ap.bssid}
                    </td>
                    <td style={{ color: 'var(--color5)', fontWeight: 700 }}>
                      Ch {ap.channel}
                    </td>
                    <td style={{ color: ap.rssi >= -65 ? '#10b981' : ap.rssi >= -75 ? '#38bdf8' : '#f59e0b' }}>
                      {ap.rssi} dBm
                    </td>
                    <td style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {ap.adapter_name || 'Wi-Fi'}
                    </td>
                  </tr>
                ))}
                {accessPoints.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      Esperando tramas RF desde los adaptadores...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SdrDiagnosticView;
