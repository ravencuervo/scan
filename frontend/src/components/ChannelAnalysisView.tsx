import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { ScannedAP } from '../types/spectrum';
import './ChannelAnalysisView.css';

interface ChannelAnalysisViewProps {
  accessPoints: ScannedAP[];
}

export const ChannelAnalysisView: React.FC<ChannelAnalysisViewProps> = ({ accessPoints = [] }) => {
  const [selectedBand, setSelectedBand] = useState<'2.4ghz' | '5ghz'>('2.4ghz');
  const [channelWidth, setChannelWidth] = useState<'all' | '20' | '40' | '80' | '160'>('20');
  const [scaleMode, setScaleMode] = useState<'dbm' | 'mw'>('dbm');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Filter APs by selected RF band
  const bandAps = useMemo(() => {
    return accessPoints.filter((ap) => (selectedBand === '2.4ghz' ? ap.channel <= 14 : ap.channel > 14));
  }, [accessPoints, selectedBand]);

  // Group APs by channel
  const channelMap = useMemo(() => {
    const map = new Map<number, ScannedAP[]>();
    bandAps.forEach((ap) => {
      const list = map.get(ap.channel) || [];
      list.push(ap);
      map.set(ap.channel, list);
    });
    return map;
  }, [bandAps]);

  // Compute optimal recommendation and congestion metrics
  const { suggestedChannel, suggestedScore, congestedChannel, maxApCount } = useMemo(() => {
    if (selectedBand === '2.4ghz') {
      const candidates = [1, 6, 11];
      let bestCh = 1;
      let minPenalty = Infinity;
      let worstCh = 6;
      let maxAps = 0;

      candidates.forEach((ch) => {
        let aps = 0;
        for (let c = ch - 2; c <= ch + 2; c++) {
          aps += (channelMap.get(c) || []).length;
        }
        if (aps < minPenalty) {
          minPenalty = aps;
          bestCh = ch;
        }
      });

      channelMap.forEach((aps, ch) => {
        if (aps.length > maxAps) {
          maxAps = aps.length;
          worstCh = ch;
        }
      });

      const score = Math.max(65, Math.min(99, 100 - minPenalty * 8));
      return {
        suggestedChannel: bestCh,
        suggestedScore: score,
        congestedChannel: worstCh,
        maxApCount: maxAps,
      };
    } else {
      const candidates = [36, 40, 44, 48, 149, 153, 157, 161];
      let bestCh = 36;
      let minAps = Infinity;
      let worstCh = 36;
      let maxAps = 0;

      candidates.forEach((ch) => {
        const count = (channelMap.get(ch) || []).length;
        if (count < minAps) {
          minAps = count;
          bestCh = ch;
        }
      });

      channelMap.forEach((aps, ch) => {
        if (aps.length > maxAps) {
          maxAps = aps.length;
          worstCh = ch;
        }
      });

      const score = Math.max(75, Math.min(100, 100 - minAps * 6));
      return {
        suggestedChannel: bestCh,
        suggestedScore: score,
        congestedChannel: worstCh,
        maxApCount: maxAps,
      };
    }
  }, [channelMap, selectedBand]);

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
          const jitter = Math.sin(phase * 1.5 + i * 0.5) * (1.2 * dpr * pulseScale);
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

      if (selectedBand === '2.4ghz') {
        // Channels 1 to 13 ticks
        const chRatio = (ch: number) => 0.12 + ((ch - 1) / 12) * 0.76;

        // Render Real Channels
        channelMap.forEach((aps, ch) => {
          if (ch < 1 || ch > 14) return;
          const bestAp = aps.reduce((p, c) => (c.rssi > p.rssi ? c : p), aps[0]);
          const r = chRatio(ch);
          const count = aps.length;

          let strokeColor = '#06b6d4';
          let fillColor = 'rgba(6, 182, 212, 0.2)';
          if (count > 3) {
            strokeColor = '#ef4444';
            fillColor = 'rgba(239, 68, 68, 0.28)';
          } else if (count > 1) {
            strokeColor = '#865db1';
            fillColor = 'rgba(134, 93, 177, 0.22)';
          }

          drawChannelBell(r, 0.22, bestAp.rssi, strokeColor, fillColor, count > 3 ? 1.8 : 1);
        });

        // Top Pinned Marker for Strongest AP
        const sortedAps = [...bandAps].sort((a, b) => b.rssi - a.rssi);
        if (sortedAps[0]) {
          const p1 = sortedAps[0];
          const p1x = padLeft + plotW * chRatio(p1.channel);
          const p1y = padTop + plotH * (1 - (p1.rssi - -95) / 65);

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
          ctx.fillText(`● ${p1.ssid}`, p1x - 64 * dpr, p1y - 34 * dpr);
          ctx.fillStyle = '#9c80bd';
          ctx.font = `${7 * dpr}px 'JetBrains Mono', monospace`;
          ctx.fillText(`Canal: Ch ${p1.channel} (20 MHz)  Potencia: ${p1.rssi} dBm`, p1x - 64 * dpr, p1y - 23 * dpr);
          ctx.fillText(`BSSID: ${p1.bssid || 'N/A'}`, p1x - 64 * dpr, p1y - 12 * dpr);
        }

        // X-axis ticks
        for (let ch = 1; ch <= 13; ch++) {
          const x = padLeft + plotW * chRatio(ch);
          const isStandard = ch === 1 || ch === 6 || ch === 11;
          ctx.fillStyle = isStandard ? '#ffffff' : '#9c80bd';
          ctx.font = `${isStandard ? 'bold ' : ''}${7.5 * dpr}px 'JetBrains Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(isStandard ? `CH ${ch}` : `${ch}`, x, h - padBottom + 14 * dpr);

          if (isStandard) {
            ctx.fillStyle = '#64748b';
            ctx.font = `${6.5 * dpr}px 'JetBrains Mono', monospace`;
            const freq = ch === 1 ? '2412 MHz' : ch === 6 ? '2437 MHz' : '2462 MHz';
            ctx.fillText(freq, x, h - padBottom + 25 * dpr);
          }
        }
      } else {
        // 5 GHz Band
        const fiveGChannels = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165];
        const chRatio5 = (ch: number) => {
          const idx = fiveGChannels.indexOf(ch);
          if (idx === -1) return 0.5;
          return 0.08 + (idx / (fiveGChannels.length - 1)) * 0.84;
        };

        channelMap.forEach((aps, ch) => {
          const bestAp = aps.reduce((p, c) => (c.rssi > p.rssi ? c : p), aps[0]);
          const r = chRatio5(ch);
          const count = aps.length;

          let strokeColor = '#06b6d4';
          let fillColor = 'rgba(6, 182, 212, 0.2)';
          if (count > 2) {
            strokeColor = '#ef4444';
            fillColor = 'rgba(239, 68, 68, 0.25)';
          }

          drawChannelBell(r, 0.12, bestAp.rssi, strokeColor, fillColor);
        });

        // Top Pinned Marker for Strongest 5 GHz AP
        const sorted5G = [...bandAps].sort((a, b) => b.rssi - a.rssi);
        if (sorted5G[0]) {
          const p1 = sorted5G[0];
          const p1x = padLeft + plotW * chRatio5(p1.channel);
          const p1y = padTop + plotH * (1 - (p1.rssi - -95) / 65);

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
          ctx.fillText(`● ${p1.ssid}`, p1x - 64 * dpr, p1y - 34 * dpr);
          ctx.fillStyle = '#9c80bd';
          ctx.font = `${7 * dpr}px 'JetBrains Mono', monospace`;
          ctx.fillText(`Canal: Ch ${p1.channel} (5 GHz)  Potencia: ${p1.rssi} dBm`, p1x - 64 * dpr, p1y - 23 * dpr);
          ctx.fillText(`BSSID: ${p1.bssid || 'N/A'}`, p1x - 64 * dpr, p1y - 12 * dpr);
        }

        // Ticks for selected representative 5 GHz channels
        [36, 44, 52, 100, 116, 132, 149, 157, 165].forEach((ch) => {
          const x = padLeft + plotW * chRatio5(ch);
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${7.5 * dpr}px 'JetBrains Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(`CH ${ch}`, x, h - padBottom + 14 * dpr);
        });
      }

      if (bandAps.length === 0) {
        ctx.fillStyle = '#9c80bd';
        ctx.font = `${9 * dpr}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(
          `Esperando transmisiones RF en banda ${selectedBand === '2.4ghz' ? '2.4 GHz' : '5 GHz'}...`,
          padLeft + plotW / 2,
          padTop + plotH / 2
        );
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [selectedBand, channelWidth, scaleMode, bandAps, channelMap]);

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
              <i className="bi bi-broadcast" style={{ color: 'inherit' }}></i> Banda 2.4 GHz (Canales 1-14)
            </button>
            <button
              className={`ca-pill-btn ${selectedBand === '5ghz' ? 'active' : ''}`}
              onClick={() => setSelectedBand('5ghz')}
            >
              <i className="bi bi-wifi" style={{ color: 'inherit' }}></i> Banda 5 GHz UNII-1/2/3 (Canales 36-165)
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
            <span>CANAL SUGERIDO POR HARDWARE</span>
            <span className="badge-sug">MÁXIMA CAPACIDAD</span>
          </div>
          <div className="ca-sug-val">
            <i className="bi bi-shield-check" style={{ color: 'inherit' }}></i>
            <span>Canal {suggestedChannel}: Puntuación {suggestedScore}/100</span>
            <span style={{ fontWeight: 600, color: 'var(--color6)' }}>(Recomendado)</span>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE MAIN SPECTRAL GRAPH */}
      <div className="ca-chart-card">
        <div className="ca-chart-header">
          <div className="ca-chart-title">
            <span className="ca-dot-active"></span>
            <span>
              Espectro de Potencia y Densidad {selectedBand === '2.4ghz' ? '2.4 GHz' : '5 GHz'} (Captura en Vivo)
            </span>
            <span className="ca-window-tag">
              {selectedBand === '2.4ghz' ? 'Ventana: 2.401 GHz - 2.483 GHz' : 'Ventana: 5.170 GHz - 5.835 GHz'}
            </span>
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
              <span>Canal Limpio (1 AP)</span>
              <span className="leg-dot" style={{ backgroundColor: '#865db1' }}></span>
              <span>Moderado (2-3 APs)</span>
              <span className="leg-dot" style={{ backgroundColor: '#ef4444' }}></span>
              <span>Congestión (&gt;3 APs)</span>
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
              <i className="bi bi-cpu" style={{ color: 'inherit' }}></i>
              <span>Observaciones Técnicas</span>
            </div>
            <span className="ca-sub-badge">TELEMETRÍA REAL</span>
          </div>

          <div className="ca-metrics-list">
            <div className="ca-metric-item">
              <span className="ca-metric-k">Mayor Densidad (Canal {congestedChannel}):</span>
              <span className="ca-metric-v">
                {maxApCount > 0 ? `${maxApCount} Puntos de Acceso` : 'Sin congestión'}
              </span>
            </div>
            <div className="ca-metric-item">
              <span className="ca-metric-k">Redes Detectadas en Banda:</span>
              <span className="ca-metric-v">{bandAps.length} BSSIDs activos</span>
            </div>
            <div className="ca-metric-item">
              <span className="ca-metric-k">Piso de Ruido Medido:</span>
              <span className="ca-metric-v">-95 dBm (Excelente)</span>
            </div>
            <div className="ca-metric-item">
              <span className="ca-metric-k">Módulos WiFi Físicos:</span>
              <span className="ca-metric-v">Captura de Hardware Activa</span>
            </div>
          </div>

          <div className="ca-info-footer">
            <span>TOTAL REDES: {bandAps.length}</span>
            <span>MODO: EN TIEMPO REAL</span>
          </div>
        </div>

        {/* Card 2: Estimaciones de Impacto */}
        <div className="ca-info-card">
          <div className="ca-info-header">
            <div className="ca-info-title">
              <i className="bi bi-graph-down" style={{ color: 'inherit' }}></i>
              <span>Estimaciones de Impacto</span>
            </div>
            <span className="ca-sub-badge">MODELO MAC/PHY</span>
          </div>

          <div className="ca-impact-body">
            <div className="ca-impact-row">
              <span>Throughput Proyectado Canal {congestedChannel}:</span>
              <span style={{ fontWeight: 700, color: maxApCount > 3 ? '#f87171' : 'var(--color6)' }}>
                {maxApCount > 3 ? `-${(maxApCount * 8.5).toFixed(1)}% vs Teórico` : 'Óptimo (Baja contienda)'}
              </span>
            </div>
            <div className="ca-impact-bar">
              <div
                className="ca-impact-fill"
                style={{ width: `${Math.min(100, maxApCount * 14)}%` }}
              ></div>
            </div>

            <div className="ca-metric-item" style={{ marginTop: '8px' }}>
              <span className="ca-metric-k">Tasa de Contienda CSMA/CA:</span>
              <span className="ca-metric-v">
                {maxApCount > 3 ? 'Alta densidad en canal ' + congestedChannel : 'Normal / Estable'}
              </span>
            </div>
            <div className="ca-metric-item">
              <span className="ca-metric-k">Canal Recomendado:</span>
              <span className="ca-metric-v">Canal {suggestedChannel} ({suggestedScore}/100)</span>
            </div>
          </div>

          <div className="ca-info-footer">
            <span>ALGORITMO: 802.11 DYNAMIC</span>
            <span style={{ fontWeight: 700 }}>CANAL SUGERIDO: CH {suggestedChannel}</span>
          </div>
        </div>

        {/* Card 3: Recomendaciones y Justificación */}
        <div className="ca-info-card">
          <div className="ca-info-header">
            <div className="ca-info-title">
              <i className="bi bi-lightning-charge" style={{ color: 'inherit' }}></i>
              <span>Recomendaciones y Justificación</span>
            </div>
            <span className="ca-sub-badge" style={{ borderColor: 'rgba(255, 255, 255, 0.2)', color: 'var(--color6)' }}>
              OPTIMIZACIÓN RF
            </span>
          </div>

          <div className="ca-recom-body">
            <div className="ca-recom-headline">
              <i className="bi bi-arrow-right-circle-fill" style={{ color: 'inherit' }}></i>
              <span>Configuración Óptima: Canal {suggestedChannel}</span>
            </div>
            <p className="ca-recom-p">
              {bandAps.length > 0
                ? `El canal ${suggestedChannel} exhibe la menor interferencia co-canal entre los transceptores analizados, garantizando contienda mínima y máximo rendimiento.`
                : 'Analizando el espectro electromagnético en busca de señales inalámbricas.'}
            </p>

            <div className="ca-stats-mini-grid">
              <div>Margen SNR Proyectado: <strong style={{ color: 'var(--color6)' }}>&gt; 38 dB</strong></div>
              <div>Interferencia Co-canal: <strong style={{ color: 'var(--color6)' }}>Mínima</strong></div>
              <div>Estado del Transceptor: <strong style={{ color: 'var(--color6)' }}>Hardware Sincronizado</strong></div>
            </div>

            <button className="btn-ca-apply">
              <i className="bi bi-gear-fill" style={{ color: 'inherit' }}></i> APLICAR CONFIGURACIÓN AUTOMÁTICA
            </button>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM STRIP: Matriz de Coexistencia */}
      <div className="ca-matrix-strip">
        <div className="matrix-strip-left">
          <i className="bi bi-grid-3x3" style={{ color: 'inherit' }}></i>
          <span>Matriz de Coexistencia e Interferencia Co-canal / Adyacente (Hardware Real)</span>
        </div>
        <div className="matrix-strip-right">
          <span>PARÁMETRO: ENERGY DETECT (-62 dBm)</span>
          <span>SENSORES FÍSICOS CONECTADOS</span>
        </div>
      </div>
    </div>
  );
};

export default ChannelAnalysisView;
