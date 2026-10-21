import React, { useState, useEffect, useRef } from 'react';
import type { ScannedAP } from '../types/spectrum';
import './ChannelAnalysisView.css';

interface ChannelAnalysisViewProps {
  accessPoints: ScannedAP[];
}

export const ChannelAnalysisView: React.FC<ChannelAnalysisViewProps> = ({ accessPoints: _accessPoints }) => {
  const [selectedBand, setSelectedBand] = useState<'2.4ghz' | '5ghz'>('2.4ghz');
  const [channelWidth, setChannelWidth] = useState<'all' | '20' | '40' | '80' | '160'>('20');
  const [scaleMode, setScaleMode] = useState<'dbm' | 'mw'>('dbm');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      phase += 0.025;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);

      const w = canvas.width;
      const h = canvas.height;
      const padLeft = 50 * dpr;
      const padRight = 40 * dpr;
      const padTop = 35 * dpr;
      const padBottom = 45 * dpr;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;

      // Dark background
      ctx.fillStyle = '#290854';
      ctx.fillRect(0, 0, w, h);

      // Horizontal dBm grid levels (-30, -50, -70, -85, -95)
      const levels = [-30, -50, -70, -85, -95];
      ctx.lineWidth = 1;
      ctx.font = `${8 * dpr}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'right';

      levels.forEach((lvl) => {
        const norm = (lvl - -95) / (-30 - -95);
        const y = padTop + plotH * (1 - norm);
        ctx.strokeStyle = lvl === -85 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(88, 51, 131, 0.3)';
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();

        ctx.fillStyle = lvl === -85 ? '#fca5a5' : '#9c80bd';
        ctx.fillText(`${lvl}`, padLeft - 8 * dpr, y + 3 * dpr);
      });

      // Noise floor text
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText('RUIDO DE PISO -95 dBm', w - padRight, padTop + plotH - 6 * dpr);

      // Parabolic curve helper
      const drawChannelBell = (
        centerRatio: number,
        widthRatio: number,
        peakDbm: number,
        color: string,
        fillColor: string,
        pulseScale = 1
      ) => {
        const cx = padLeft + plotW * centerRatio;
        const bw = plotW * widthRatio;
        const norm = (peakDbm - -95) / (-30 - -95);
        const peakY = padTop + plotH * (1 - norm);
        const baseY = padTop + plotH;

        ctx.beginPath();
        const steps = 40;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = cx - bw / 2 + bw * t;
          const bell = Math.sin(t * Math.PI);
          const jitter = Math.sin(phase * 1.5 + i * 0.5) * (1.5 * dpr * pulseScale);
          const y = baseY - (baseY - peakY) * Math.pow(bell, 1.4) + jitter;

          if (i === 0) ctx.moveTo(x, baseY);
          else ctx.lineTo(x, y);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.2 * dpr;
        ctx.stroke();

        ctx.lineTo(cx + bw / 2, baseY);
        ctx.lineTo(cx - bw / 2, baseY);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
      };

      // Draw Channel Curves matching Image 3:
      // Ch 1 (2.412 GHz) - Clean Active (Cyan #06b6d4)
      drawChannelBell(0.18, 0.22, -42, '#06b6d4', 'rgba(6, 182, 212, 0.25)');
      // Ch 3-4 (Interf. Adyacente - Amber #f59e0b)
      drawChannelBell(0.32, 0.20, -72, '#f59e0b', 'rgba(245, 158, 11, 0.15)');
      // Ch 6 (2.437 GHz) - Severe Collision (Red #ef4444)
      drawChannelBell(0.52, 0.26, -34, '#ef4444', 'rgba(239, 68, 68, 0.35)', 2);
      // Ch 8-9 (Interf. Adyacente - Amber #f59e0b)
      drawChannelBell(0.68, 0.20, -74, '#f59e0b', 'rgba(245, 158, 11, 0.15)');
      // Ch 11 (2.462 GHz) - Clean Optimal (Green #10b981)
      drawChannelBell(0.85, 0.22, -40, '#10b981', 'rgba(16, 185, 129, 0.25)');

      // Pinned Marker 1: Ch 1 AP_CORP_01
      const p1x = padLeft + plotW * 0.18;
      const p1y = padTop + plotH * (1 - (-42 - -95) / 65);
      ctx.fillStyle = '#1e053e';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.roundRect(p1x - 70 * dpr, p1y - 48 * dpr, 140 * dpr, 42 * dpr, 4 * dpr);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#06b6d4';
      ctx.font = `bold ${8 * dpr}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('● AP_CORP_01', p1x - 64 * dpr, p1y - 34 * dpr);
      ctx.fillStyle = '#9c80bd';
      ctx.font = `${7 * dpr}px 'JetBrains Mono', monospace`;
      ctx.fillText('Canal: Ch 1 (20 MHz)  Potencia: -42 dBm', p1x - 64 * dpr, p1y - 23 * dpr);
      ctx.fillText('Margen SNR: 48 dB   Carga: 14 Clientes', p1x - 64 * dpr, p1y - 12 * dpr);

      // Pinned Marker 2: Ch 6 Alta Congestión
      const p2x = padLeft + plotW * 0.52;
      const p2y = padTop + plotH * (1 - (-34 - -95) / 65);
      ctx.fillStyle = '#1e053e';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.roundRect(p2x - 65 * dpr, p2y - 36 * dpr, 130 * dpr, 30 * dpr, 4 * dpr);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.font = `bold ${7.5 * dpr}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('⚠ ALTA CONGESTIÓN CSMA/CA', p2x - 58 * dpr, p2y - 22 * dpr);
      ctx.fillStyle = '#fca5a5';
      ctx.font = `${7 * dpr}px 'JetBrains Mono', monospace`;
      ctx.fillText('16 APs Co-canal | Retransmisión: +32%', p2x - 58 * dpr, p2y - 11 * dpr);

      // Pinned Marker 3: Ch 11 Canal Limpio
      const p3x = padLeft + plotW * 0.85;
      const p3y = padTop + plotH * (1 - (-40 - -95) / 65);
      ctx.fillStyle = '#1e053e';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.roundRect(p3x - 65 * dpr, p3y - 36 * dpr, 130 * dpr, 30 * dpr, 4 * dpr);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = `bold ${7.5 * dpr}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('✓ CANAL LIMPIO (SCORE 96)', p3x - 58 * dpr, p3y - 22 * dpr);
      ctx.fillStyle = '#6ee7b7';
      ctx.font = `${7 * dpr}px 'JetBrains Mono', monospace`;
      ctx.fillText('2 APs | Tráfico no 802.11: 0%', p3x - 58 * dpr, p3y - 11 * dpr);

      // X-axis Channels 1 to 13 ticks
      const chTicks = [
        { ch: 'CH 1', freq: '2412 MHz', r: 0.18, highlight: '#06b6d4' },
        { ch: '2', r: 0.25 },
        { ch: '3', r: 0.32 },
        { ch: '4', r: 0.38 },
        { ch: '5', r: 0.45 },
        { ch: 'CH 6', freq: '2437 MHz', r: 0.52, highlight: '#ef4444' },
        { ch: '7', r: 0.59 },
        { ch: '8', r: 0.66 },
        { ch: '9', r: 0.72 },
        { ch: '10', r: 0.79 },
        { ch: 'CH 11', freq: '2462 MHz', r: 0.85, highlight: '#10b981' },
        { ch: '12', r: 0.91 },
        { ch: '13', r: 0.96 },
      ];

      chTicks.forEach((t) => {
        const x = padLeft + plotW * t.r;
        ctx.fillStyle = t.highlight || '#9c80bd';
        ctx.font = `${t.highlight ? 'bold ' : ''}${7.5 * dpr}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(t.ch, x, h - padBottom + 14 * dpr);
        if (t.freq) {
          ctx.fillStyle = '#64748b';
          ctx.font = `${6.5 * dpr}px 'JetBrains Mono', monospace`;
          ctx.fillText(t.freq, x, h - padBottom + 25 * dpr);
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [selectedBand, channelWidth, scaleMode]);

  return (
    <div className="channel-analysis-container">
      {/* 1. TOP FILTER BAR */}
      <div className="ca-filter-bar">
        <div className="ca-filter-group">
          <span className="ca-filter-label">BANDA DE FRECUENCIA RF</span>
          <div className="ca-toggle-pills">
            <button
              className={`ca-pill-btn ${selectedBand === '2.4ghz' ? 'active' : ''}`}
              onClick={() => setSelectedBand('2.4ghz')}
            >
              <i className="bi bi-broadcast"></i> Banda 2.4 GHz (Canales 1-14)
            </button>
            <button
              className={`ca-pill-btn ${selectedBand === '5ghz' ? 'active' : ''}`}
              onClick={() => setSelectedBand('5ghz')}
            >
              <i className="bi bi-wifi"></i> Banda 5 GHz UNII-1/2/3 (Canales 36-165)
            </button>
          </div>
        </div>

        <div className="ca-filter-group">
          <span className="ca-filter-label">ANCHO DE CANAL (BW)</span>
          <div className="ca-width-pills">
            {(['all', '20', '40', '80', '160'] as const).map((w) => (
              <button
                key={w}
                className={`ca-w-btn ${channelWidth === w ? 'active' : ''}`}
                onClick={() => setChannelWidth(w)}
              >
                {w === 'all' ? 'Todos' : `${w} MHz`}
              </button>
            ))}
          </div>
        </div>

        <div className="ca-suggested-card">
          <div className="ca-sug-header">
            <span>CANAL SUGERIDO POR ALGORITMO</span>
            <span className="badge-sug">MÁXIMA CAPACIDAD</span>
          </div>
          <div className="ca-sug-val">
            <i className="bi bi-shield-check" style={{ color: '#10b981' }}></i>
            <span>Canal 11: Puntuación 96/100</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>(Recomendado)</span>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE MAIN SPECTRAL GRAPH */}
      <div className="ca-chart-card">
        <div className="ca-chart-header">
          <div className="ca-chart-title">
            <span className="ca-dot-active"></span>
            <span>
              Espectro de Potencia y Densidad de Canales 2.4 GHz (FFT en Vivo)
            </span>
            <span className="ca-window-tag">Ventana: 2.401 GHz - 2.483 GHz</span>
          </div>

          <div className="ca-chart-controls">
            <div className="ca-scale-toggle">
              <span className="scale-label">ESCALA:</span>
              <button
                className={`scale-btn ${scaleMode === 'dbm' ? 'active' : ''}`}
                onClick={() => setScaleMode('dbm')}
              >
                dBm
              </button>
              <button
                className={`scale-btn ${scaleMode === 'mw' ? 'active' : ''}`}
                onClick={() => setScaleMode('mw')}
              >
                mW
              </button>
            </div>

            <div className="ca-legend-items">
              <span className="leg-dot" style={{ backgroundColor: '#06b6d4' }}></span>
              <span>Activo Limpio</span>
              <span className="leg-dot" style={{ backgroundColor: '#865db1' }}></span>
              <span>Secundario</span>
              <span className="leg-dot" style={{ backgroundColor: '#f59e0b' }}></span>
              <span>Interf. Adyacente</span>
              <span className="leg-dot" style={{ backgroundColor: '#ef4444' }}></span>
              <span>Colisión Severa (Ch 6)</span>
            </div>
          </div>
        </div>

        <div className="ca-canvas-wrap">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* 3. BOTTOM 3-CARD ROW */}
      <div className="ca-triplet-grid">
        {/* Card 1: Observaciones Técnicas */}
        <div className="ca-info-card">
          <div className="ca-info-header">
            <div className="ca-info-title">
              <i className="bi bi-cpu" style={{ color: 'var(--color5)' }}></i>
              <span>Observaciones Técnicas</span>
            </div>
            <span className="ca-sub-badge">TELEMETRÍA SDR</span>
          </div>

          <div className="ca-metrics-list">
            <div className="ca-metric-item">
              <span className="ca-metric-k">Densidad Co-canal (Ch 6):</span>
              <span className="ca-metric-v" style={{ color: '#f87171' }}>14 Puntos de Acceso</span>
            </div>
            <div className="ca-metric-item">
              <span className="ca-metric-k">Tasa de Balizas (Beacons):</span>
              <span className="ca-metric-v">182 beacons / segundo</span>
            </div>
            <div className="ca-metric-item">
              <span className="ca-metric-k">Piso de Ruido Medido:</span>
              <span className="ca-metric-v" style={{ color: '#34d399' }}>-95 dBm (Excelente)</span>
            </div>
            <div className="ca-metric-item">
              <span className="ca-metric-k">Interferencias No-WiFi (BLE/MW):</span>
              <span className="ca-metric-v">Baja emisión (4.2%)</span>
            </div>
          </div>

          <div className="ca-info-footer">
            <span>MUESTRAS: 128,400 PAQUETES</span>
            <span>TIEMPO: 380s</span>
          </div>
        </div>

        {/* Card 2: Estimaciones de Impacto */}
        <div className="ca-info-card">
          <div className="ca-info-header">
            <div className="ca-info-title">
              <i className="bi bi-graph-down" style={{ color: 'var(--color5)' }}></i>
              <span>Estimaciones de Impacto</span>
            </div>
            <span className="ca-sub-badge">MODELO MAC/PHY</span>
          </div>

          <div className="ca-impact-body">
            <div className="ca-impact-row">
              <span>Throughput Efectivo Canal 6:</span>
              <span style={{ color: '#f87171', fontWeight: 700 }}>-44.6% vs Teórico</span>
            </div>
            <div className="ca-impact-bar">
              <div className="ca-impact-fill" style={{ width: '44.6%' }}></div>
            </div>

            <div className="ca-metric-item" style={{ marginTop: '8px' }}>
              <span className="ca-metric-k">Tasa Retransmisión Estimada:</span>
              <span className="ca-metric-v" style={{ color: '#fca5a5' }}>+28% (Contienda Severa)</span>
            </div>
            <div className="ca-metric-item">
              <span className="ca-metric-k">Packet Drop Rate (Frame Loss):</span>
              <span className="ca-metric-v" style={{ color: '#f87171' }}>4.8% en Canal 6</span>
            </div>
          </div>

          <div className="ca-info-footer">
            <span>ALGORITMO: 802.11ax MAC MODEL</span>
            <span style={{ color: '#ef4444', fontWeight: 700 }}>CRÍTICO EN CH 6</span>
          </div>
        </div>

        {/* Card 3: Recomendaciones y Justificación */}
        <div className="ca-info-card">
          <div className="ca-info-header">
            <div className="ca-info-title">
              <i className="bi bi-lightning-charge" style={{ color: 'var(--color5)' }}></i>
              <span>Recomendaciones y Justificación</span>
            </div>
            <span className="ca-sub-badge" style={{ borderColor: '#10b981', color: '#34d399' }}>
              OPTIMIZACIÓN RF
            </span>
          </div>

          <div className="ca-recom-body">
            <div className="ca-recom-headline">
              <i className="bi bi-arrow-right-circle-fill" style={{ color: '#06b6d4' }}></i>
              <span>Migración Inmediata a Canal 11 (2462 MHz)</span>
            </div>
            <p className="ca-recom-p">
              El canal 11 exhibe únicamente 2 BSSIDs remotos con señal inferior a -82 dBm, garantizando contienda nula bajo el estándar IEEE 802.11k/v.
            </p>

            <div className="ca-stats-mini-grid">
              <div>Margen SNR Proyectado: <strong style={{ color: '#34d399' }}>&gt; 38 dB</strong></div>
              <div>Interferencia No-802.11: <strong style={{ color: '#34d399' }}>0.0% Detectada</strong></div>
              <div>Ganancia Throughput Neto: <strong style={{ color: '#34d399' }}>+32 Mbps</strong></div>
            </div>

            <button className="btn-ca-apply">
              <i className="bi bi-gear-fill"></i> APLICAR CONFIGURACIÓN AUTOMÁTICA EN RPSM
            </button>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM STRIP: Matriz de Coexistencia */}
      <div className="ca-matrix-strip">
        <div className="matrix-strip-left">
          <i className="bi bi-grid-3x3"></i>
          <span>Matriz de Coexistencia e Interferencia Co-canal / Adyacente (Canales 1 al 13)</span>
        </div>
        <div className="matrix-strip-right">
          <span>PARÁMETRO: CCA ENERGY DETECT (-62 dBm)</span>
          <span>RESOLUCIÓN TEMPORAL: 10s AVG</span>
        </div>
      </div>
    </div>
  );
};
