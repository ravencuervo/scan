import React, { useState } from 'react';
import type { ScannedAP } from '../types/spectrum';
import './NetworksTable.css';

interface NetworksTableProps {
  accessPoints: ScannedAP[];
}

export const NetworksTable: React.FC<NetworksTableProps> = ({ accessPoints }) => {
  const [bandFilter, setBandFilter] = useState<'all' | '2.4ghz' | '5ghz'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  let filtered = [...accessPoints];

  if (bandFilter === '2.4ghz') {
    filtered = filtered.filter((ap) => ap.channel <= 14);
  } else if (bandFilter === '5ghz') {
    filtered = filtered.filter((ap) => ap.channel >= 36);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (ap) =>
        ap.ssid.toLowerCase().includes(q) ||
        ap.bssid.toLowerCase().includes(q) ||
        (ap.vendor && ap.vendor.toLowerCase().includes(q))
    );
  }

  filtered.sort((a, b) => b.rssi - a.rssi);

  return (
    <section className="panel table-panel">
      <div className="panel-header">
        <div className="panel-title">
          <i className="bi bi-list-columns-reverse" style={{ color: 'inherit' }}></i>
          <span>Inventario de Redes Inalámbricas Detectadas</span>
        </div>

        <div className="table-controls">
          <div className="search-box">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Buscar por SSID, BSSID o Fabricante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <button
              className={`filter-btn ${bandFilter === 'all' ? 'active' : ''}`}
              onClick={() => setBandFilter('all')}
            >
              Todas ({accessPoints.length})
            </button>
            <button
              className={`filter-btn ${bandFilter === '2.4ghz' ? 'active' : ''}`}
              onClick={() => setBandFilter('2.4ghz')}
            >
              2.4 GHz
            </button>
            <button
              className={`filter-btn ${bandFilter === '5ghz' ? 'active' : ''}`}
              onClick={() => setBandFilter('5ghz')}
            >
              5 GHz
            </button>
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>SSID (Nombre de Red)</th>
              <th>BSSID (MAC)</th>
              <th>Fabricante</th>
              <th>Adaptador</th>
              <th>Canal</th>
              <th>Banda</th>
              <th>Potencia Señal (RSSI)</th>
              <th>Cifrado / Seguridad</th>
              <th>Ancho</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No se detectaron redes con los filtros aplicados.
                </td>
              </tr>
            ) : (
              filtered.map((ap) => {
                let barColor = 'var(--color5)';
                if (ap.rssi >= -65) barColor = 'var(--color5)';
                else if (ap.rssi >= -75) barColor = 'var(--color4)';
                else barColor = 'var(--color3)';

                return (
                  <tr key={ap.bssid}>
                    <td>
                      <strong>{ap.ssid || '<Oculta>'}</strong>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {ap.bssid}
                      </span>
                    </td>
                    <td>{ap.vendor || 'Desconocido'}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontFamily: 'var(--font-mono)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255, 255, 255, 0.07)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: 'var(--color6)',
                        }}
                      >
                        <i className="bi bi-wifi" style={{ marginRight: '5px', color: 'inherit' }}></i>
                        {ap.adapter_name || 'Wi-Fi'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--color5)', fontFamily: 'var(--font-mono)' }}>
                        {ap.channel}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${ap.band === '5GHz' ? 'badge-engine' : 'badge-live'}`}>
                        {ap.band}
                      </span>
                    </td>
                    <td>
                      <div className="signal-bar-container">
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color6)' }}>
                          {ap.rssi} dBm
                        </span>
                        <div className="signal-meter">
                          <div
                            className="signal-meter-fill"
                            style={{
                              width: `${ap.signal_quality}%`,
                              backgroundColor: barColor,
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ap.security || 'WPA2'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {ap.channel_width || 20} MHz
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
