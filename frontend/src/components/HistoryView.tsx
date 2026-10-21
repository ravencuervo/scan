import React, { useState, useEffect, useRef } from 'react';
import './HistoryView.css';

interface HistoryViewProps {
  onGeneratePdf: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onGeneratePdf }) => {
  const [bandFilter, setBandFilter] = useState<'all' | '2.4ghz' | '5ghz' | '6ghz'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<string[]>([
    '#SES-2025-0512-B',
    '#SES-2025-0512-A',
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const sessionsData = [
    {
      id: '#SES-2025-0512-B',
      date: '12 May 2025 17:15',
      channels: 'Ch 1-14 / 36-165',
      occupancy: '46.1%',
      collisions: '2 colisiones',
      status: 'OPTIMIZADO',
      color: '#10b981',
    },
    {
      id: '#SES-2025-0512-A',
      date: '12 May 2025 09:30',
      channels: 'Ch 1-14 / 36-165',
      occupancy: '78.4%',
      collisions: '16 colisiones',
      status: 'CRÍTICO',
      color: '#ef4444',
    },
    {
      id: '#SES-2025-0511-C',
      date: '11 May 2025 16:45',
      channels: 'Ch 1-14',
      occupancy: '62.0%',
      collisions: '8 colisiones',
      status: 'MODERADO',
      color: '#f59e0b',
    },
    {
      id: '#SES-2025-0510-A',
      date: '10 May 2025 11:20',
      channels: 'Ch 36-165',
      occupancy: '34.5%',
      collisions: '1 colisión',
      status: 'DESPEJADO',
      color: '#10b981',
    },
  ];

  const toggleSelect = (id: string) => {
    if (selectedSessions.includes(id)) {
      setSelectedSessions(selectedSessions.filter((s) => s !== id));
    } else {
      setSelectedSessions([...selectedSessions, id]);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      phase += 0.02;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);

      const w = canvas.width;
      const h = canvas.height;
      const padLeft = 45 * dpr;
      const padRight = 35 * dpr;
      const padTop = 30 * dpr;
      const padBottom = 40 * dpr;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;

      // Dark background
      ctx.fillStyle = '#290854';
      ctx.fillRect(0, 0, w, h);

      // Horizontal lines
      [-30, -50, -70, -90].forEach((lvl) => {
        const norm = (lvl - -95) / (-30 - -95);
        const y = padTop + plotH * (1 - norm);
        ctx.strokeStyle = 'rgba(88, 51, 131, 0.3)';
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();

        ctx.fillStyle = '#9c80bd';
        ctx.font = `${7.5 * dpr}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'right';
        ctx.fillText(`${lvl} dBm`, padLeft - 6 * dpr, y + 3 * dpr);
      });

      // Noise floor
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.fillText('-90 (Noise Floor)', padLeft + 6 * dpr, padTop + plotH - 6 * dpr);

      const drawComparativeCurve = (
        cxRatio: number,
        bwRatio: number,
        peakDbm: number,
        color: string,
        fillColor: string,
        isDashed = false
      ) => {
        const cx = padLeft + plotW * cxRatio;
        const bw = plotW * bwRatio;
        const norm = (peakDbm - -95) / (-30 - -95);
        const peakY = padTop + plotH * (1 - norm);
        const baseY = padTop + plotH;

        ctx.beginPath();
        if (isDashed) ctx.setLineDash([4 * dpr, 4 * dpr]);
        else ctx.setLineDash([]);

        const steps = 30;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = cx - bw / 2 + bw * t;
          const bell = Math.sin(t * Math.PI);
          const y = baseY - (baseY - peakY) * Math.pow(bell, 1.4);
          if (i === 0) ctx.moveTo(x, baseY);
          else ctx.lineTo(x, y);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();

        ctx.lineTo(cx + bw / 2, baseY);
        ctx.lineTo(cx - bw / 2, baseY);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.setLineDash([]);
      };

      // Ch 1: Session A (Purple #865db1) & Session B (Cyan #06b6d4)
      drawComparativeCurve(0.18, 0.22, -62, '#865db1', 'rgba(134, 93, 177, 0.25)');
      drawComparativeCurve(0.18, 0.22, -64, '#06b6d4', 'rgba(6, 182, 212, 0.25)', true);

      // Ch 6: Session A was High (-36 dBm, congested), Session B reduced to (-64 dBm)
      drawComparativeCurve(0.50, 0.28, -36, '#865db1', 'rgba(134, 93, 177, 0.35)');
      drawComparativeCurve(0.50, 0.24, -64, '#06b6d4', 'rgba(6, 182, 212, 0.4)');

      // Ch 11: Session B increased to (-60 dBm, absorbing load)
      drawComparativeCurve(0.82, 0.24, -60, '#06b6d4', 'rgba(6, 182, 212, 0.4)');

      // Delta Marker on Ch 6
      const mx = padLeft + plotW * 0.50;
      const my = padTop + plotH * (1 - (-36 - -95) / 65);
      ctx.fillStyle = '#1e053e';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.roundRect(mx - 75 * dpr, my - 34 * dpr, 150 * dpr, 28 * dpr, 4 * dpr);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = `bold ${7.5 * dpr}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('DELTA: -28 dBm INTERFERENCIA', mx, my - 20 * dpr);
      ctx.fillStyle = '#9c80bd';
      ctx.font = `${6.8 * dpr}px 'JetBrains Mono', monospace`;
      ctx.fillText('Solapamiento co-canal mitigado en Ch 6', mx, my - 10 * dpr);

      // Channel Frequency ticks
      const channels = [
        { ch: 'Ch 1', f: '2412M', r: 0.18 },
        { ch: 'Ch 2', r: 0.24 },
        { ch: 'Ch 3', r: 0.30 },
        { ch: 'Ch 4', r: 0.36 },
        { ch: 'Ch 5', r: 0.42 },
        { ch: 'Ch 6', f: '2437M', r: 0.50 },
        { ch: 'Ch 7', r: 0.56 },
        { ch: 'Ch 8', r: 0.62 },
        { ch: 'Ch 9', r: 0.68 },
        { ch: 'Ch 10', r: 0.74 },
        { ch: 'Ch 11', f: '2462M', r: 0.82 },
        { ch: 'Ch 12', r: 0.88 },
        { ch: 'Ch 13', r: 0.94 },
      ];

      channels.forEach((c) => {
        const x = padLeft + plotW * c.r;
        ctx.fillStyle = c.f ? '#38bdf8' : '#9c80bd';
        ctx.font = `${7 * dpr}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(c.ch, x, h - padBottom + 14 * dpr);
        if (c.f) {
          ctx.fillStyle = '#64748b';
          ctx.font = `${6 * dpr}px 'JetBrains Mono', monospace`;
          ctx.fillText(c.f, x, h - padBottom + 24 * dpr);
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="history-view-container">
      {/* 1. TOP FILTER STRIP */}
      <div className="hist-filter-strip">
        <div className="hist-filter-left">
          <div className="hist-input-box">
            <i className="bi bi-calendar3"></i>
            <span>12 May 2025 (Hoy)</span>
          </div>

          <div className="hist-band-group">
            <span className="hist-lbl">BANDA:</span>
            <button
              className={`hist-btn ${bandFilter === '2.4ghz' ? 'active' : ''}`}
              onClick={() => setBandFilter('2.4ghz')}
            >
              2.4 GHz
            </button>
            <button
              className={`hist-btn ${bandFilter === '5ghz' ? 'active' : ''}`}
              onClick={() => setBandFilter('5ghz')}
            >
              5.0 GHz
            </button>
            <button
              className={`hist-btn ${bandFilter === '6ghz' ? 'active' : ''}`}
              onClick={() => setBandFilter('6ghz')}
            >
              6.0 GHz
            </button>
            <button
              className={`hist-btn ${bandFilter === 'all' ? 'active' : ''}`}
              onClick={() => setBandFilter('all')}
            >
              Dual Band (Todas)
            </button>
          </div>

          <div className="hist-congestion-box">
            <i className="bi bi-funnel"></i>
            <span>CONGESTIÓN: Moderada & Crítica</span>
          </div>

          <button className="hist-clear-btn" onClick={() => setBandFilter('all')}>
            <i className="bi bi-arrow-counterclockwise"></i> Limpiar filtros
          </button>
        </div>

        <div className="hist-filter-right">
          <span className="hist-marked-tag">
            {selectedSessions.length} SESIONES MARCADAS
          </span>
          <button className="btn-hist-compare">
            <i className="bi bi-plus-lg"></i> Comparar 2 Sesiones Seleccionadas
          </button>
        </div>
      </div>

      {/* 2. MAIN SPECTRAL COMPARISON SPLIT (70% / 30%) */}
      <div className="hist-main-split">
        {/* Left: Overlaid Spectrum Chart */}
        <div className="hist-chart-card">
          <div className="hist-chart-header">
            <div className="hist-chart-title">
              <span className="hist-dot"></span>
              <span>
                Espectro Superpuesto: Ocupación por Canal Diferencial
              </span>
              <span className="hist-delta-tag">DELTA A vs B</span>
            </div>

            <div className="hist-chart-legends">
              <span className="hist-session-pill pill-purple">
                ■ Sesión A (09:30 Base)
              </span>
              <span className="hist-session-pill pill-cyan">
                ■ Sesión B (17:15 Post-Opt)
              </span>
            </div>
          </div>

          <div className="hist-canvas-wrap">
            <canvas ref={canvasRef} />
          </div>

          <div className="hist-verdict-banner">
            <div className="verdict-txt">
              <i className="bi bi-check-circle-fill" style={{ color: '#10b981' }}></i>
              <span>
                <strong>DICTAMEN TÉCNICO COMPARATIVO:</strong> La reasignación de canales en 2.4 GHz redujo las tramas de retransmisión a niveles nominales.
              </span>
            </div>
            <div className="verdict-actions">
              <button className="btn-verdict-csv">Exportar CSV Diff</button>
              <button className="btn-verdict-pdf" onClick={onGeneratePdf}>
                Generar PDF
              </button>
            </div>
          </div>
        </div>

        {/* Right: Resumen Delta (A vs B) */}
        <div className="hist-delta-summary-card">
          <div className="delta-card-header">
            <span className="delta-title">RESUMEN DELTA (A vs B)</span>
            <span className="delta-status-badge">ESTADO: MEJORA NOTABLE</span>
          </div>

          <div className="delta-metrics-list">
            {/* Metric 1 */}
            <div className="delta-metric-box">
              <div className="d-metric-top">
                <span className="d-lbl">OCUPACIÓN ESPECTRAL</span>
                <span className="d-gain" style={{ color: '#34d399' }}>-32.3% mejora</span>
              </div>
              <div className="d-val-row">
                <span className="d-prev">78.4%</span>
                <i className="bi bi-arrow-right"></i>
                <span className="d-cur">46.1%</span>
              </div>
              <div className="d-bar-track">
                <div className="d-bar-fill" style={{ width: '46.1%' }}></div>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="delta-metric-box">
              <div className="d-metric-top">
                <span className="d-lbl">COLISIONES CO-CANAL</span>
                <span className="d-gain" style={{ color: '#34d399' }}>-54% Reducción</span>
              </div>
              <p className="d-desc">
                Mitigación crítica tras desplazar APs prioritarios hacia Canal 11 y Canal 36 (UNII-1).
              </p>
              <span className="d-sub-info">• Retransmisiones: bajó de 18.2% a 3.1%</span>
            </div>

            {/* Metric 3 */}
            <div className="delta-metric-box">
              <div className="d-metric-top">
                <span className="d-lbl">ESTABILIDAD RSSI (DESV. ESTÁNDAR)</span>
                <span className="d-gain" style={{ color: '#38bdf8' }}>3.5x más estable</span>
              </div>
              <div className="d-val-row">
                <span className="d-prev">±6.8 dBm</span>
                <i className="bi bi-arrow-right"></i>
                <span className="d-cur">±1.9 dBm</span>
              </div>
              <span className="d-sub-info">Dispersión de potencia RF mitigada de forma uniforme</span>
            </div>

            {/* Metric 4 */}
            <div className="delta-metric-box">
              <div className="d-metric-top">
                <span className="d-lbl">APS EN CONFLICTO / SOLAPADOS</span>
                <span className="d-gain" style={{ color: '#34d399' }}>-14 APs</span>
              </div>
              <div className="d-val-row">
                <span className="d-prev">16 APs (A)</span>
                <i className="bi bi-arrow-right"></i>
                <span className="d-cur">2 APs (B)</span>
              </div>
              <span className="d-sub-info">Solapamiento residual tolerado</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM SESSIONS TABLE */}
      <div className="hist-table-card">
        <div className="hist-table-header">
          <div className="hist-table-title">
            <i className="bi bi-clock-history" style={{ color: 'var(--color5)' }}></i>
            <span>Registro de Sesiones Almacenadas en Disco</span>
          </div>
          <div className="hist-table-actions">
            <div className="hist-search-box">
              <i className="bi bi-search"></i>
              <input
                type="text"
                placeholder="Filtrar por ID de Sesión..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <span className="hist-showing-txt">Mostrando 4 de 48 capturas</span>
          </div>
        </div>

        <div className="hist-table-scroll">
          <table className="hist-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>SEL</th>
                <th>ID SESIÓN</th>
                <th>FECHA Y HORA</th>
                <th>CANAL MUESTRAS</th>
                <th>OCUPACIÓN GLOBAL</th>
                <th>COLISIONES</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {sessionsData.map((ses) => {
                const isSelected = selectedSessions.includes(ses.id);
                return (
                  <tr key={ses.id} className={isSelected ? 'selected-row' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(ses.id)}
                      />
                    </td>
                    <td className="cell-ses-id">{ses.id}</td>
                    <td className="cell-ses-date">{ses.date}</td>
                    <td className="cell-ses-chan">{ses.channels}</td>
                    <td className="cell-ses-occ">{ses.occupancy}</td>
                    <td className="cell-ses-col">{ses.collisions}</td>
                    <td>
                      <span
                        className="badge-ses-status"
                        style={{
                          borderColor: ses.color,
                          color: ses.color,
                          backgroundColor: ses.color + '15',
                        }}
                      >
                        {ses.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn-ses-view">Ver Detalle</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
