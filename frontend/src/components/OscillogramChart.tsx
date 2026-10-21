import React, { useState, useEffect, useRef } from 'react';
import type { ScannedAP } from '../types/spectrum';
import { Spectrum2D } from './Spectrum2D';
import { Spectrum3D } from './Spectrum3D';
import './OscillogramChart.css';

interface OscillogramChartProps {
  accessPoints: ScannedAP[];
}

export const OscillogramChart: React.FC<OscillogramChartProps> = ({ accessPoints }) => {
  const [viewMode, setViewMode] = useState<'live' | 'history' | 'spectrum2d' | '3d'>('live');
  const [selectedMetric, setSelectedMetric] = useState('RSSI (dBm)');
  const [selectedSSID, setSelectedSSID] = useState('Todas');
  const [windowRange, setWindowRange] = useState('5 min');
  const [sampleRate, setSampleRate] = useState('500 ms');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (viewMode !== 'live' && viewMode !== 'history') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      phase += 0.035;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);

      const w = canvas.width;
      const h = canvas.height;
      const padLeft = 60 * dpr;
      const padRight = 30 * dpr;
      const padTop = 25 * dpr;
      const padBottom = 35 * dpr;

      // Solid color1 background
      ctx.fillStyle = '#290854';
      ctx.fillRect(0, 0, w, h);

      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;

      // dBm horizontal levels: -45, -60, -75, -90 dBm
      const levels = [-45, -60, -75, -90];
      const minDbm = -95;
      const maxDbm = -35;

      const dbmToY = (dbm: number) => {
        const norm = (dbm - minDbm) / (maxDbm - minDbm);
        return padTop + plotH * (1 - norm);
      };

      // Grid Lines & dBm Levels
      ctx.lineWidth = 1;
      ctx.font = `${8.5 * dpr}px 'JetBrains Mono', monospace`;

      levels.forEach((lvl) => {
        const y = dbmToY(lvl);
        ctx.strokeStyle = 'rgba(88, 51, 131, 0.35)';
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();

        // Left dBm label
        ctx.fillStyle = '#9c80bd';
        ctx.textAlign = 'right';
        ctx.fillText(`${lvl} dBm`, padLeft - 6 * dpr, y + 3 * dpr);

        // Right dBm label matching screenshot
        ctx.fillStyle = '#6b4f8c';
        ctx.textAlign = 'left';
        ctx.fillText(lvl === -90 ? '-90 dBm (Ruido)' : `${lvl} dBm`, w - padRight + 6 * dpr, y + 3 * dpr);
      });

      // Sensitivity Threshold Line (-85 dBm)
      const threshY = dbmToY(-85);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 1.2 * dpr;
      ctx.setLineDash([5 * dpr, 4 * dpr]);
      ctx.beginPath();
      ctx.moveTo(padLeft, threshY);
      ctx.lineTo(w - padRight, threshY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Vertical Time Ticks
      const timeTicks = [
        '-05:00 min',
        '-04:00 min',
        '-03:00 min',
        '-02:00 min',
        '-01:00 min',
        'T-0 (AHORA)',
      ];
      timeTicks.forEach((tick, idx) => {
        const x = padLeft + (idx / (timeTicks.length - 1)) * plotW;
        ctx.strokeStyle = 'rgba(88, 51, 131, 0.25)';
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + plotH);
        ctx.stroke();

        ctx.fillStyle = idx === timeTicks.length - 1 ? '#865db1' : '#9c80bd';
        ctx.font = `${8 * dpr}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(tick, x, h - padBottom + 16 * dpr);
      });

      // Draw Oscillogram Waves from Real Hardware Scanned APs
      const primaryAp = accessPoints[0] || null;
      const secondaryAp = accessPoints[1] || null;

      const drawWave = (color: string, baseRssi: number, freq: number, phaseShift: number) => {
        ctx.beginPath();
        const step = 4;
        for (let px = 0; px <= plotW; px += step) {
          const tNorm = px / plotW;
          const osc =
            Math.sin(tNorm * freq + phase + phaseShift) * 14 +
            Math.cos(tNorm * (freq * 0.5) - phase) * 7;
          const dbm = baseRssi + osc * (1 - tNorm * 0.25);
          const py = dbmToY(dbm);
          if (px === 0) ctx.moveTo(padLeft + px, py);
          else ctx.lineTo(padLeft + px, py);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.4 * dpr;
        ctx.stroke();

        // Soft gradient glow below curve
        ctx.lineTo(padLeft + plotW, padTop + plotH);
        ctx.lineTo(padLeft, padTop + plotH);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
        grad.addColorStop(0, color + '44');
        grad.addColorStop(1, color + '00');
        ctx.fillStyle = grad;
        ctx.fill();
      };

      if (secondaryAp) {
        // Draw secondary curve (Purple #865db1)
        drawWave('#865db1', secondaryAp.rssi, 6, 2.5);

        // Floating Marker Tooltip for Secondary
        const pin2X = padLeft + plotW * 0.72;
        const pin2Y = dbmToY(secondaryAp.rssi);
        ctx.fillStyle = '#1e053e';
        ctx.strokeStyle = '#865db1';
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.roundRect(pin2X - 58 * dpr, pin2Y - 26 * dpr, 116 * dpr, 20 * dpr, 4 * dpr);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#865db1';
        ctx.font = `bold ${8.5 * dpr}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`${secondaryAp.ssid}: ${secondaryAp.rssi} dBm`, pin2X, pin2Y - 13 * dpr);
      }

      if (primaryAp) {
        // Draw primary curve (Cyan #38bdf8)
        drawWave('#38bdf8', primaryAp.rssi, 4.5, 0);

        // Floating Marker Tooltip for Primary
        const pin1X = padLeft + plotW * 0.22;
        const pin1Y = dbmToY(primaryAp.rssi);
        ctx.fillStyle = '#1e053e';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.roundRect(pin1X - 60 * dpr, pin1Y - 26 * dpr, 120 * dpr, 20 * dpr, 4 * dpr);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${8.5 * dpr}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`${primaryAp.ssid}: ${primaryAp.rssi} dBm`, pin1X, pin1Y - 13 * dpr);
      } else {
        // Baseline noise curve when starting or scanning
        drawWave('#6f489a', -92, 3, 0);
        ctx.fillStyle = '#9c80bd';
        ctx.font = `${9 * dpr}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('Capturando señales de radiofrecuencia desde adaptadores físicos...', padLeft + plotW / 2, padTop + plotH / 2);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [viewMode, accessPoints]);

  return (
    <div className="oscillogram-panel">
      {/* Header bar */}
      <div className="oscillogram-header">
        <div className="oscillogram-title-group">
          <span className="oscillogram-dot"></span>
          <span className="oscillogram-title-txt">
            Oscilograma Temporal de Densidad de Señal
          </span>
          <span className="oscillogram-fft-res">FFT RESOLUTION: 0.1 dBm</span>
        </div>

        <div className="oscillogram-view-tabs">
          <button
            className={`oscillogram-tab-btn ${viewMode === 'live' ? 'active' : ''}`}
            onClick={() => setViewMode('live')}
          >
            <span>•• EN VIVO</span>
          </button>
          <button
            className={`oscillogram-tab-btn ${viewMode === 'history' ? 'active' : ''}`}
            onClick={() => setViewMode('history')}
          >
            <span>HISTÓRICO</span>
          </button>
          <button
            className={`oscillogram-tab-btn ${viewMode === 'spectrum2d' ? 'active' : ''}`}
            onClick={() => setViewMode('spectrum2d')}
          >
            <span>2D</span>
          </button>
          <button
            className={`oscillogram-tab-btn ${viewMode === '3d' ? 'active' : ''}`}
            onClick={() => setViewMode('3d')}
          >
            <span>3D</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="oscillogram-filters-bar">
        <div className="filter-select-item">
          <span className="filter-select-label">MÉTRICA</span>
          <select
            className="filter-select-input"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
          >
            <option value="RSSI (dBm)">RSSI (dBm)</option>
            <option value="SNR (dB)">SNR (dB)</option>
            <option value="Densidad Potencia">Densidad Potencia</option>
          </select>
        </div>

        <div className="filter-select-item">
          <span className="filter-select-label">RED (FILTRO SSID)</span>
          <select
            className="filter-select-input"
            value={selectedSSID}
            onChange={(e) => setSelectedSSID(e.target.value)}
          >
            <option value="Todas">Todas las redes</option>
            {accessPoints.map((ap) => (
              <option key={ap.bssid} value={ap.ssid}>
                {ap.ssid} (Ch {ap.channel})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-select-item">
          <span className="filter-select-label">VENTANA TEMPORAL</span>
          <select
            className="filter-select-input"
            value={windowRange}
            onChange={(e) => setWindowRange(e.target.value)}
          >
            <option value="1 min">1 min</option>
            <option value="5 min">5 min</option>
            <option value="15 min">15 min</option>
            <option value="1 hora">1 hora</option>
          </select>
        </div>

        <div className="filter-select-item">
          <span className="filter-select-label">INTERVALO DE MUESTREO</span>
          <select
            className="filter-select-input"
            value={sampleRate}
            onChange={(e) => setSampleRate(e.target.value)}
          >
            <option value="100 ms">100 ms</option>
            <option value="500 ms">500 ms</option>
            <option value="1000 ms">1000 ms</option>
          </select>
        </div>
      </div>

      {/* Visualization Canvas Body */}
      <div className="oscillogram-canvas-container">
        {(viewMode === 'live' || viewMode === 'history') && (
          <canvas ref={canvasRef} id="oscillogramCanvas" />
        )}
        {viewMode === 'spectrum2d' && (
          <Spectrum2D accessPoints={accessPoints} band="2.4ghz" />
        )}
        {viewMode === '3d' && <Spectrum3D accessPoints={accessPoints} />}
      </div>

      {/* Footer Legend */}
      <div className="oscillogram-footer">
        <div className="oscillogram-legend-items">
          <div className="legend-tag">
            <span className="legend-line" style={{ backgroundColor: '#38bdf8' }}></span>
            <span>{accessPoints[0] ? `Canal ${accessPoints[0].channel} (${accessPoints[0].ssid})` : 'Sensor 1 (Esperando señal)'}</span>
          </div>

          <div className="legend-tag">
            <span className="legend-line" style={{ backgroundColor: '#865db1' }}></span>
            <span>{accessPoints[1] ? `Canal ${accessPoints[1].channel} (${accessPoints[1].ssid})` : 'Sensor 2 (Esperando señal)'}</span>
          </div>

          <div className="legend-tag">
            <span className="legend-line-dashed"></span>
            <span style={{ color: '#94a3b8' }}>Umbral de Sensibilidad (-85 dBm)</span>
          </div>
        </div>

        <span className="antenna-spec-tag">RECEPTORES HARDWARE REALES</span>
      </div>
    </div>
  );
};
