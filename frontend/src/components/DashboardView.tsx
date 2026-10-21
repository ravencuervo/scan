import React, { useState, useEffect, useRef } from 'react';
import type { ScannedAP, SpectrumMetrics, SpectrumRecommendations } from '../types/spectrum';
import './DashboardView.css';

interface DashboardViewProps {
  accessPoints: ScannedAP[];
  metrics: SpectrumMetrics | null;
  recommendations: SpectrumRecommendations | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  accessPoints,
  metrics,
  recommendations: _recommendations,
}) => {
  const [bandSelection, setBandSelection] = useState<'both' | '2.4ghz' | '5ghz'>('both');
  const [searchQuery, setSearchQuery] = useState('');

  const fftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rssiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fallback demo APs if none scanned yet
  const defaultAps = [
    { ssid: 'AP_CORP_01', bssid: '00:1A:2B:3C:4D:5E', channel: 1, rssi: -38, width: '20 MHz', security: 'WPA3', state: 'ÓPTIMO', stateColor: '#10b981' },
    { ssid: 'CORP_SECURE_5G', bssid: '00:1A:2B:3C:4D:5F', channel: 36, rssi: -52, width: '80 MHz', security: 'WPA3', state: 'ACTIVO', stateColor: '#10b981' },
    { ssid: 'AP_BODEGA_CH6', bssid: '44:E5:D7:88:99:A1', channel: 6, rssi: -68, width: '40 MHz', security: 'WPA2', state: 'COLISIÓN', stateColor: '#ef4444' },
    { ssid: 'Guest_Wi-Fi_Floor1', bssid: '78:9A:18:FC:22:90', channel: 3, rssi: -81, width: '20 MHz', security: 'OPEN', state: 'DÉBIL', stateColor: '#94a3b8' },
    { ssid: 'DIRECTOR_AP_EXECUTIVE', bssid: 'AC:86:74:10:04:11', channel: 149, rssi: -58, width: '80 MHz', security: 'WPA3-ENT', state: 'ACTIVO', stateColor: '#10b981' },
  ];

  // Dynamic values
  const totalCount = accessPoints.length > 0 ? accessPoints.length : 38;
  const count24 = accessPoints.filter((a) => a.channel <= 14).length || 16;
  const count5 = accessPoints.filter((a) => a.channel >= 36).length || 22;
  const occupancyVal = metrics?.overall_health_score ? (100 - metrics.overall_health_score * 0.3).toFixed(1) : '74.2';

  // Render Spectral Occupancy Bell Curves (FFT RF)
  useEffect(() => {
    const canvas = fftCanvasRef.current;
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

      // Horizontal grid lines
      const dbmLevels = [-30, -45, -60, -75, -90];
      ctx.lineWidth = 1;
      ctx.font = `${8 * dpr}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'right';

      dbmLevels.forEach((lvl) => {
        const norm = (lvl - -95) / (-30 - -95);
        const y = padTop + plotH * (1 - norm);
        ctx.strokeStyle = 'rgba(88, 51, 131, 0.35)';
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();

        ctx.fillStyle = '#9c80bd';
        ctx.fillText(`${lvl} dBm`, w - 6 * dpr, y + 3 * dpr);
      });

      // Band divider vertical line
      const divX = padLeft + plotW * 0.48;
      ctx.strokeStyle = 'rgba(111, 72, 154, 0.45)';
      ctx.setLineDash([4 * dpr, 4 * dpr]);
      ctx.beginPath();
      ctx.moveTo(divX, padTop);
      ctx.lineTo(divX, padTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#865db1';
      ctx.font = `${7.5 * dpr}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('DIVISOR DE BANDA (5 GHz UNII)', divX, padTop - 8 * dpr);

      // Function to draw parabolic spectral curve
      const drawParabola = (
        centerXRatio: number,
        widthRatio: number,
        peakDbm: number,
        color: string,
        label: string,
        isDotted = false
      ) => {
        const cx = padLeft + plotW * centerXRatio;
        const bw = plotW * widthRatio;
        const norm = (peakDbm - -95) / (-30 - -95);
        const peakY = padTop + plotH * (1 - norm);
        const baseY = padTop + plotH;

        ctx.beginPath();
        if (isDotted) ctx.setLineDash([3 * dpr, 3 * dpr]);
        else ctx.setLineDash([]);

        const steps = 40;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps; // 0 to 1
          const x = cx - bw / 2 + bw * t;
          // Inverted parabola (cosine bell curve)
          const bell = Math.sin(t * Math.PI);
          const dynamicJitter = Math.sin(phase + i * 0.4) * (2 * dpr);
          const y = baseY - (baseY - peakY) * Math.pow(bell, 1.4) + dynamicJitter;

          if (i === 0) ctx.moveTo(x, baseY);
          else ctx.lineTo(x, y);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();

        // Gradient under curve
        ctx.lineTo(cx + bw / 2, baseY);
        ctx.lineTo(cx - bw / 2, baseY);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, peakY, 0, baseY);
        grad.addColorStop(0, color + '55');
        grad.addColorStop(1, color + '00');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.setLineDash([]);

        // Label above peak
        ctx.fillStyle = color;
        ctx.font = `bold ${8 * dpr}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, peakY - 8 * dpr);
      };

      // Draw 2.4 GHz side curves
      if (bandSelection === 'both' || bandSelection === '2.4ghz') {
        drawParabola(0.12, 0.16, -38, '#f43f5e', 'AP_CORP_01 (-38 dBm)');
        drawParabola(0.17, 0.14, -62, '#06b6d4', 'Guest_Wi-Fi', true);
        drawParabola(0.26, 0.16, -46, '#f43f5e', 'AP_BODEGA_CH6');
        drawParabola(0.38, 0.16, -42, '#10b981', 'Canal 11 (ÓPTIMO)');
      }

      // Draw 5 GHz side curves
      if (bandSelection === 'both' || bandSelection === '5ghz') {
        drawParabola(0.62, 0.22, -45, '#865db1', 'COMP_SECURE_5G (80MHz)');
        drawParabola(0.85, 0.18, -52, '#865db1', 'DIRECTOR_AP');
      }

      // Channel X-axis ticks
      const channels = [
        { name: 'Ch 1', r: 0.12 },
        { name: 'Ch 3', r: 0.17 },
        { name: 'Ch 6', r: 0.26 },
        { name: 'Ch 9', r: 0.32 },
        { name: 'Ch 11 (2.4G)', r: 0.38 },
        { name: 'Ch 36', r: 0.54 },
        { name: 'Ch 40', r: 0.60 },
        { name: 'Ch 44', r: 0.66 },
        { name: 'Ch 48', r: 0.72 },
        { name: 'Ch 149', r: 0.80 },
        { name: 'Ch 157', r: 0.85 },
        { name: 'Ch 165', r: 0.90 },
      ];

      ctx.fillStyle = '#9c80bd';
      ctx.font = `${7.5 * dpr}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      channels.forEach((c) => {
        const x = padLeft + plotW * c.r;
        ctx.fillText(c.name, x, h - padBottom + 16 * dpr);
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [bandSelection]);

  // Render RSSI Temporal Line Chart
  useEffect(() => {
    const canvas = rssiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let offset = 0;

    const render = () => {
      offset += 0.03;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);

      const w = canvas.width;
      const h = canvas.height;
      const padLeft = 25 * dpr;
      const padRight = 35 * dpr;
      const padTop = 20 * dpr;
      const padBottom = 25 * dpr;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;

      // Dark background
      ctx.fillStyle = '#290854';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
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
        ctx.fillText(`${lvl}`, w - 6 * dpr, y + 3 * dpr);
      });

      const drawTrendLine = (baseDbm: number, color: string, freq: number, phaseShift: number) => {
        ctx.beginPath();
        const steps = 24;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = padLeft + plotW * t;
          const osc = Math.sin(t * freq + offset + phaseShift) * 7;
          const dbm = baseDbm + osc;
          const norm = (dbm - -95) / (-30 - -95);
          const y = padTop + plotH * (1 - norm);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8 * dpr;
        ctx.stroke();
      };

      // 3 AP trend lines
      drawTrendLine(-38, '#06b6d4', 4, 0); // Cyan: AP_CORP_01
      drawTrendLine(-52, '#865db1', 5, 2); // Purple: CORP_SECURE_5G
      drawTrendLine(-78, '#f43f5e', 7, 4); // Red/Dashed: AP_BODEGA_CH6

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  const filteredAps = defaultAps.filter(
    (ap) =>
      ap.ssid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ap.bssid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard-view-container">
      {/* 1. TOP ROW: 4 KPI CARDS matching Image 1 */}
      <div className="dashboard-kpi-grid">
        {/* KPI 1 */}
        <div className="dash-kpi-card">
          <div className="dash-kpi-header">
            <span className="dash-kpi-label">REDES DETECTADAS</span>
            <span className="dash-kpi-tag tag-green">+4 nuevas</span>
          </div>
          <div className="dash-kpi-body">
            <span className="dash-kpi-main-val">{totalCount}</span>
            <span className="dash-kpi-unit">SSIDs</span>
          </div>
          <div className="dash-kpi-sub">
            <span>{count5} en 5 GHz</span>
            <span>{count24} en 2.4 GHz</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="dash-kpi-card">
          <div className="dash-kpi-header">
            <span className="dash-kpi-label">OCUPACIÓN ESTIMADA</span>
            <span className="dash-kpi-tag tag-amber">Densidad RF Elevada</span>
          </div>
          <div className="dash-kpi-body">
            <span className="dash-kpi-main-val">{occupancyVal}%</span>
            <span className="dash-kpi-unit">de ancho de banda</span>
          </div>
          <div className="dash-kpi-progress-bar">
            <div className="dash-kpi-progress-fill" style={{ width: `${occupancyVal}%` }}></div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="dash-kpi-card">
          <div className="dash-kpi-header">
            <span className="dash-kpi-label">ÍNDICE DE INTERFERENCIA</span>
            <span className="dash-kpi-tag tag-red">
              <i className="bi bi-exclamation-triangle"></i> Alerta Severa
            </span>
          </div>
          <div className="dash-kpi-body">
            <span className="dash-kpi-main-val" style={{ color: '#ef4444' }}>61</span>
            <span className="dash-kpi-unit">/ 100</span>
          </div>
          <div className="dash-kpi-alert-sub">
            <span style={{ color: '#fca5a5' }}>Colisión severa en Ch 1 y 6</span>
            <i className="bi bi-broadcast" style={{ color: '#ef4444' }}></i>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="dash-kpi-card">
          <div className="dash-kpi-header">
            <span className="dash-kpi-label">CANAL SUGERIDO (ÓPTIMO)</span>
            <span className="dash-kpi-tag tag-green">Score 94/100</span>
          </div>
          <div className="dash-kpi-body">
            <span className="dash-kpi-main-val" style={{ fontSize: '1.25rem' }}>
              Ch 11 (2.4G) & Ch 36 (5G)
            </span>
          </div>
          <div className="dash-kpi-alert-sub">
            <span style={{ color: '#34d399' }}>SNR Estimado: +32 dB</span>
            <i className="bi bi-check-circle" style={{ color: '#10b981' }}></i>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE ROW: Ocupación Espectral FFT RF (65%) + RSSI Temporal (35%) */}
      <div className="dashboard-charts-split">
        {/* Spectral Occupancy FFT Chart */}
        <div className="dash-chart-card dash-fft-card">
          <div className="dash-chart-header">
            <div className="dash-chart-title">
              <span className="chart-dot-pulse"></span>
              <span>Ocupación Espectral por Canal (FFT RF)</span>
            </div>
            <div className="dash-chart-toggles">
              <span
                className={`dash-band-tab ${bandSelection === '2.4ghz' ? 'active' : ''}`}
                onClick={() => setBandSelection('2.4ghz')}
              >
                — 2.4 GHz
              </span>
              <span
                className={`dash-band-tab ${bandSelection === '5ghz' ? 'active' : ''}`}
                onClick={() => setBandSelection('5ghz')}
              >
                — 5 GHz
              </span>
              <button
                className={`dash-band-btn ${bandSelection === 'both' ? 'active' : ''}`}
                onClick={() => setBandSelection('both')}
              >
                AMBAS 2.4G 5G
              </button>
            </div>
          </div>

          <div className="dash-canvas-wrap">
            <canvas ref={fftCanvasRef} />
          </div>

          <div className="dash-chart-footer">
            <span>Resolución FFT: 4096 bins / Intervalo: 1000ms</span>
            <span style={{ color: '#38bdf8' }}>Solapamiento espectral: 38% en 2.412 GHz</span>
          </div>
        </div>

        {/* RSSI Temporal Multi-line Chart */}
        <div className="dash-chart-card dash-rssi-card">
          <div className="dash-chart-header">
            <div className="dash-chart-title">
              <i className="bi bi-graph-up" style={{ color: 'var(--color5)' }}></i>
              <span>RSSI Temporal</span>
            </div>
            <span className="dash-time-tag">Últimos 15 min</span>
          </div>

          <div className="dash-canvas-wrap">
            <canvas ref={rssiCanvasRef} />
          </div>

          <div className="dash-rssi-legend">
            <div className="rssi-leg-item">
              <span className="leg-color-box" style={{ backgroundColor: '#06b6d4' }}></span>
              <span className="leg-name">AP_CORP_01</span>
              <span className="leg-val">-38 dBm</span>
            </div>
            <div className="rssi-leg-item">
              <span className="leg-color-box" style={{ backgroundColor: '#865db1' }}></span>
              <span className="leg-name">CORP_SECURE_5G</span>
              <span className="leg-val">-52 dBm</span>
            </div>
            <div className="rssi-leg-item">
              <span className="leg-color-box" style={{ backgroundColor: '#f43f5e' }}></span>
              <span className="leg-name">AP_BODEGA_CH6</span>
              <span className="leg-val">-78 dBm</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM ROW: Redes Detectadas (60%) + Recomendaciones Técnicas (40%) */}
      <div className="dashboard-bottom-split">
        {/* Left: Real-time APs Table */}
        <div className="dash-table-card">
          <div className="dash-table-header">
            <div className="dash-chart-title">
              <i className="bi bi-broadcast-pin" style={{ color: 'var(--color5)' }}></i>
              <span>Redes Detectadas en Tiempo Real</span>
            </div>
            <div className="dash-table-search">
              <i className="bi bi-search"></i>
              <input
                type="text"
                placeholder="Filtrar SSID / MAC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="dash-table-scroll">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>SSID</th>
                  <th>BSSID MAC</th>
                  <th>CANAL</th>
                  <th>NIVEL RSSI</th>
                  <th>ANCHO</th>
                  <th>SEGURIDAD</th>
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {filteredAps.map((ap) => (
                  <tr key={ap.bssid}>
                    <td className="cell-ssid">{ap.ssid}</td>
                    <td className="cell-mono">{ap.bssid}</td>
                    <td className="cell-mono">{ap.channel}</td>
                    <td>
                      <div className="rssi-bar-cell">
                        <div
                          className="rssi-mini-bar"
                          style={{
                            width: `${Math.min(100, Math.max(10, (ap.rssi + 100) * 1.5))}%`,
                            backgroundColor: ap.stateColor,
                          }}
                        ></div>
                        <span className="cell-mono">{ap.rssi} dBm</span>
                      </div>
                    </td>
                    <td className="cell-mono">{ap.width}</td>
                    <td>
                      <span className="badge-sec">{ap.security}</span>
                    </td>
                    <td>
                      <span
                        className="badge-state"
                        style={{
                          borderColor: ap.stateColor,
                          color: ap.stateColor,
                          backgroundColor: ap.stateColor + '18',
                        }}
                      >
                        {ap.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Technical Recommendations Card */}
        <div className="dash-recom-card">
          <div className="dash-recom-header">
            <div className="dash-chart-title">
              <i className="bi bi-shield-shaded" style={{ color: 'var(--color5)' }}></i>
              <span>Recomendaciones Técnicas Inmediatas</span>
            </div>
            <span className="dash-recom-count">3 ACCIONES</span>
          </div>

          <div className="dash-recom-list">
            {/* Rec 1 */}
            <div className="recom-item">
              <div className="recom-title-row">
                <i className="bi bi-arrow-repeat" style={{ color: '#38bdf8' }}></i>
                <span className="recom-title">Migrar tráfico del canal 6 al canal 11</span>
              </div>
              <p className="recom-desc">
                Reduce un 42% de colisiones co-canal detectadas entre AP_BODEGA_CH6 y redes adyacentes no controladas.
              </p>
              <div className="recom-action-row">
                <span className="recom-impact">Impacto Estimado: +6.4 Mbps</span>
                <button className="btn-recom-apply">APLICAR SUGERENCIA</button>
              </div>
            </div>

            {/* Rec 2 */}
            <div className="recom-item recom-alert">
              <div className="recom-title-row">
                <i className="bi bi-exclamation-triangle-fill" style={{ color: '#ef4444' }}></i>
                <span className="recom-title">Interferencia no WiFi detectada en 2.437 GHz</span>
              </div>
              <p className="recom-desc">
                Fuente continua de radiofrecuencia (posible horno microondas industrial o enlace CCTV analógico activo).
              </p>
              <div className="recom-action-row">
                <span className="recom-impact" style={{ color: '#f87171' }}>
                  Severidad: Alta (Ch 6 degradado)
                </span>
                <button className="btn-recom-locate">LOCALIZAR EMISOR</button>
              </div>
            </div>

            {/* Rec 3 */}
            <div className="recom-item">
              <div className="recom-title-row">
                <i className="bi bi-sliders" style={{ color: '#f59e0b' }}></i>
                <span className="recom-title">Potencia excesiva en AP-Planta-Baja</span>
              </div>
              <p className="recom-desc">
                Reducir potencia de transmisión a 14 dBm para evitar solapamiento innecesario con celdas de piso 2.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
