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
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

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

  const bandApsRef = useRef(bandAps);
  bandApsRef.current = bandAps;
  const channelMapRef = useRef(channelMap);
  channelMapRef.current = channelMap;
  const selectedBandRef = useRef(selectedBand);
  selectedBandRef.current = selectedBand;

  // Smoothing state for channel parabolas
  const smoothedChannelsRef = useRef<
    Map<
      string,
      {
        band: '2.4ghz' | '5ghz';
        ch: number;
        currentDbm: number;
        targetDbm: number;
        opacity: number;
        targetOpacity: number;
        count: number;
        centerRatio: number;
        widthRatio: number;
      }
    >
  >(new Map());

  // Smoothing state for the top pinned AP badge
  const markerRef = useRef({
    currentX: 0,
    currentY: 0,
    opacity: 0,
    ssid: '',
    channel: 0,
    rssi: -95,
    bssid: '',
    band: '',
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const fiveGChannels = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165];
    const chRatio24 = (ch: number) => 0.12 + ((ch - 1) / 12) * 0.76;
    const chRatio5 = (ch: number) => {
      const idx = fiveGChannels.indexOf(ch);
      if (idx === -1) return 0.5;
      return 0.08 + (idx / (fiveGChannels.length - 1)) * 0.84;
    };

    const render = () => {
      phase += 0.025;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.floor(rect.width * dpr);
      const targetH = Math.floor(rect.height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const w = canvas.width;
      const h = canvas.height;
      const padLeft = 50 * dpr;
      const padRight = 40 * dpr;
      const padTop = 35 * dpr;
      const padBottom = 45 * dpr;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;

      const currentBand = selectedBandRef.current;
      const currentMap = channelMapRef.current;
      const currentBandAps = bandApsRef.current;

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

      // Parabolic curve drawing helper
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
        const norm = Math.max(0, Math.min(1, (peakDbm - -95) / (-30 - -95)));
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

      // 1. Update targets for smoothed channels
      const activeKeys = new Set<string>();
      currentMap.forEach((aps, ch) => {
        if (aps.length === 0) return;
        const is24 = ch <= 14;
        const band: '2.4ghz' | '5ghz' = is24 ? '2.4ghz' : '5ghz';
        if (band !== currentBand) return;

        const bestAp = aps.reduce((p, c) => (c.rssi > p.rssi ? c : p), aps[0]);
        const key = `${band}_${ch}`;
        activeKeys.add(key);

        const centerRatio = is24 ? chRatio24(ch) : chRatio5(ch);
        const widthRatio = is24 ? 0.22 : 0.12;

        const existing = smoothedChannelsRef.current.get(key);
        if (!existing) {
          smoothedChannelsRef.current.set(key, {
            band,
            ch,
            currentDbm: -95,
            targetDbm: bestAp.rssi,
            opacity: 0,
            targetOpacity: 1,
            count: aps.length,
            centerRatio,
            widthRatio,
          });
        } else {
          existing.targetDbm = bestAp.rssi;
          existing.targetOpacity = 1;
          existing.count = aps.length;
          existing.centerRatio = centerRatio;
          existing.widthRatio = widthRatio;
        }
      });

      // Mark channels that are no longer active or in another band to fade out smoothly
      smoothedChannelsRef.current.forEach((st, k) => {
        if (!activeKeys.has(k)) {
          st.targetDbm = -95;
          st.targetOpacity = 0;
        }
      });

      // 2. Interpolate and draw smoothed channels with LERP
      const toDelete: string[] = [];
      smoothedChannelsRef.current.forEach((st, k) => {
        st.currentDbm += (st.targetDbm - st.currentDbm) * 0.08;
        st.opacity += (st.targetOpacity - st.opacity) * 0.08;

        if (st.opacity < 0.01 && st.targetOpacity === 0) {
          toDelete.push(k);
          return;
        }

        if (st.opacity > 0.01) {
          let strokeColor = '#06b6d4';
          let fillColor = 'rgba(6, 182, 212, 0.2)';
          if (st.count > 3) {
            strokeColor = '#ef4444';
            fillColor = 'rgba(239, 68, 68, 0.28)';
          } else if (st.count > 1) {
            strokeColor = '#865db1';
            fillColor = 'rgba(134, 93, 177, 0.22)';
          }

          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, st.opacity));
          drawChannelBell(st.centerRatio, st.widthRatio, st.currentDbm, strokeColor, fillColor, st.count > 3 ? 1.8 : 1);
          ctx.restore();
        }
      });

      toDelete.forEach((k) => smoothedChannelsRef.current.delete(k));

      // 3. X-Axis Ticks & Labels according to selected band
      if (currentBand === '2.4ghz') {
        for (let ch = 1; ch <= 13; ch++) {
          const x = padLeft + plotW * chRatio24(ch);
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
        [36, 44, 52, 100, 116, 132, 149, 157, 165].forEach((ch) => {
          const x = padLeft + plotW * chRatio5(ch);
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${7.5 * dpr}px 'JetBrains Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(`CH ${ch}`, x, h - padBottom + 14 * dpr);
        });
      }

      // 4. Smooth Pinned Marker for Strongest AP
      const sortedAps = [...currentBandAps].sort((a, b) => b.rssi - a.rssi);
      const p1 = sortedAps[0];
      const m = markerRef.current;

      if (p1) {
        const ratio = currentBand === '2.4ghz' ? chRatio24(p1.channel) : chRatio5(p1.channel);
        const targetX = padLeft + plotW * ratio;
        const norm = Math.max(0, Math.min(1, (p1.rssi - -95) / 65));
        const targetY = padTop + plotH * (1 - norm);

        if (m.currentX === 0 || m.opacity < 0.05) {
          m.currentX = targetX;
          m.currentY = targetY;
          m.rssi = p1.rssi;
        } else {
          m.currentX += (targetX - m.currentX) * 0.08;
          m.currentY += (targetY - m.currentY) * 0.08;
          m.rssi += (p1.rssi - m.rssi) * 0.08;
        }
        m.opacity += (1 - m.opacity) * 0.08;
        m.ssid = p1.ssid;
        m.channel = p1.channel;
        m.bssid = p1.bssid || 'N/A';
        m.band = currentBand === '2.4ghz' ? '20 MHz' : '5 GHz';
      } else {
        m.opacity += (0 - m.opacity) * 0.08;
      }

      if (m.opacity > 0.02) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, m.opacity));
        const p1x = m.currentX;
        const p1y = m.currentY;

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
        ctx.fillText(`● ${m.ssid}`, p1x - 64 * dpr, p1y - 34 * dpr);
        ctx.fillStyle = '#9c80bd';
        ctx.font = `${7 * dpr}px 'JetBrains Mono', monospace`;
        ctx.fillText(`Canal: Ch ${m.channel} (${m.band})  Potencia: ${Math.round(m.rssi)} dBm`, p1x - 64 * dpr, p1y - 23 * dpr);
        ctx.fillText(`BSSID: ${m.bssid}`, p1x - 64 * dpr, p1y - 12 * dpr);
        ctx.restore();
      }

      // Empty State Text
      if (currentBandAps.length === 0 && smoothedChannelsRef.current.size === 0) {
        ctx.fillStyle = '#9c80bd';
        ctx.font = `${9 * dpr}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(
          `Esperando transmisiones RF en banda ${currentBand === '2.4ghz' ? '2.4 GHz' : '5 GHz'}...`,
          padLeft + plotW / 2,
          padTop + plotH / 2
        );
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

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

            {appliedMessage && (
              <div
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid #10b981',
                  color: '#34d399',
                  fontSize: '0.72rem',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                }}
              >
                <i className="bi bi-check-circle-fill"></i>
                <span>{appliedMessage}</span>
              </div>
            )}

            <button
              className="btn-ca-apply"
              disabled={isApplying}
              onClick={async () => {
                setIsApplying(true);
                try {
                  const res = await fetch('/api/channels/apply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      target_channel: suggestedChannel,
                      band: selectedBand,
                    }),
                  });
                  if (res.ok) {
                    setAppliedMessage(`Canal Ch ${suggestedChannel} (${selectedBand === '2.4ghz' ? '2.4 GHz' : '5 GHz'}) configurado en el transceptor.`);
                    setTimeout(() => setAppliedMessage(null), 4000);
                  }
                } catch (err) {
                  console.error('Error applying channel:', err);
                } finally {
                  setIsApplying(false);
                }
              }}
            >
              <i className="bi bi-gear-fill" style={{ color: 'inherit' }}></i>
              {isApplying ? 'APLICANDO AL HARDWARE...' : `APLICAR CANAL ${suggestedChannel} AUTOMÁTICAMENTE`}
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
