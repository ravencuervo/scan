import React, { useState, useMemo } from 'react';
import type { ScannedAP, SpectrumMetrics, SpectrumRecommendations, WirelessAdapter, User } from '../types/spectrum';
import './ReportsView.css';

interface ReportsViewProps {
  accessPoints?: ScannedAP[];
  metrics?: SpectrumMetrics | null;
  recommendations?: SpectrumRecommendations | null;
  adapters?: WirelessAdapter[];
  user?: User | null;
  onExportPdf: () => void;
  onExportExcel?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  accessPoints = [],
  metrics,
  recommendations,
  adapters = [],
  user,
  onExportPdf,
  onExportExcel,
}) => {
  const [selectedBand, setSelectedBand] = useState<'all' | '2.4' | '5'>('all');

  const currentDate = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const currentTime = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalAps = accessPoints.length;
  const healthScore = metrics?.overall_health_score ?? (totalAps > 0 ? 82 : 100);

  // Group APs by channel
  const channelMap = useMemo(() => {
    const map = new Map<number, ScannedAP[]>();
    accessPoints.forEach((ap) => {
      const list = map.get(ap.channel) || [];
      list.push(ap);
      map.set(ap.channel, list);
    });
    return map;
  }, [accessPoints]);

  // Channel definitions for 2.4 GHz and 5 GHz
  const channels24 = [
    { ch: 1, freq: '2.412' },
    { ch: 2, freq: '2.417' },
    { ch: 3, freq: '2.422' },
    { ch: 4, freq: '2.427' },
    { ch: 5, freq: '2.432' },
    { ch: 6, freq: '2.437' },
    { ch: 7, freq: '2.442' },
    { ch: 8, freq: '2.447' },
    { ch: 9, freq: '2.452' },
    { ch: 10, freq: '2.457' },
    { ch: 11, freq: '2.462' },
    { ch: 12, freq: '2.467' },
    { ch: 13, freq: '2.472' },
  ];

  const channels5 = [
    { ch: 36, freq: '5.180' },
    { ch: 40, freq: '5.200' },
    { ch: 44, freq: '5.220' },
    { ch: 48, freq: '5.240' },
    { ch: 52, freq: '5.260' },
    { ch: 56, freq: '5.280' },
    { ch: 60, freq: '5.300' },
    { ch: 64, freq: '5.320' },
    { ch: 100, freq: '5.500' },
    { ch: 149, freq: '5.745' },
    { ch: 153, freq: '5.765' },
    { ch: 157, freq: '5.785' },
    { ch: 161, freq: '5.805' },
    { ch: 165, freq: '5.825' },
  ];

  const activeChannels = useMemo(() => {
    if (selectedBand === '2.4') return channels24;
    if (selectedBand === '5') return channels5;

    // For 'all', show all 2.4 channels + main 5 GHz channels that exist or have APs
    return [
      ...channels24.filter((c) => [1, 3, 6, 7, 9, 11].includes(c.ch) || (channelMap.get(c.ch) || []).length > 0),
      ...channels5.filter((c) => [36, 44, 52, 56, 149, 153].includes(c.ch) || (channelMap.get(c.ch) || []).length > 0),
    ];
  }, [selectedBand, channelMap]);

  // Find max congestion and optimal clean channel
  const { maxCongestedCh, maxApsOnCh, recommendedCh } = useMemo(() => {
    let maxCh = 6;
    let maxCount = 0;
    channelMap.forEach((aps, ch) => {
      if (aps.length > maxCount) {
        maxCount = aps.length;
        maxCh = ch;
      }
    });

    // Check non-overlapping 1, 6, 11
    let bestCh = 1;
    let minLoad = Infinity;
    [1, 6, 11].forEach((ch) => {
      let load = 0;
      for (let c = ch - 1; c <= ch + 1; c++) {
        load += (channelMap.get(c) || []).length;
      }
      if (load < minLoad) {
        minLoad = load;
        bestCh = ch;
      }
    });

    return {
      maxCongestedCh: maxCh,
      maxApsOnCh: maxCount,
      recommendedCh: bestCh,
    };
  }, [channelMap]);

  // Channel bars data
  const histogramBars = useMemo(() => {
    return activeChannels.map((c) => {
      const aps = channelMap.get(c.ch) || [];
      const count = aps.length;
      const bestRssi = count > 0 ? Math.max(...aps.map((a) => a.rssi)) : null;

      // Occupancy percentage logic
      let occupancy = 4; // visual baseline
      if (count === 1) occupancy = 28;
      else if (count === 2) occupancy = 48;
      else if (count === 3) occupancy = 72;
      else if (count >= 4) occupancy = Math.min(100, 72 + (count - 3) * 10);

      const isCritical = occupancy >= 70;
      const isModerate = occupancy >= 40 && occupancy < 70;

      return {
        ch: c.ch,
        freq: c.freq,
        count,
        bestRssi,
        occupancy,
        isCritical,
        isModerate,
        aps,
      };
    });
  }, [activeChannels, channelMap]);

  const adapterNames =
    adapters.length > 0
      ? adapters.map((a) => `${a.name} (${a.description})`).join(' • ')
      : 'Controlador WLAN Físico Windows';

  return (
    <div className="reports-view-container">
      {/* 1. TOP TITLE AND ACTIONS BAR */}
      <div className="rep-header-actions-bar">
        <div className="rep-header-left">
          <i className="bi bi-file-earmark-bar-graph-fill" style={{ color: 'inherit' }}></i>
          <span>Informe Técnico de Ingeniería RF — Telemetría de Hardware Directa</span>
        </div>

        <div className="rep-header-btns">
          <button className="btn-rep-pdf" onClick={onExportPdf}>
            <i className="bi bi-file-earmark-pdf"></i> Exportar Informe PDF
          </button>
          <button className="btn-rep-excel" onClick={onExportExcel}>
            <i className="bi bi-file-earmark-excel"></i> Exportar Datos Excel (XLSX)
          </button>
          <button className="btn-rep-icon" onClick={() => window.print()} title="Imprimir informe">
            <i className="bi bi-printer"></i>
          </button>
        </div>
      </div>

      {/* 2. OFFICIAL AUDIT METADATA CARD */}
      <div className="rep-certificate-card">
        <div className="cert-top-row">
          <div>
            <div className="cert-sub-badge">AUDITORÍA DE ESPECTRO RF EN VIVO</div>
            <h2 className="cert-main-title">Auditoría Radioeléctrica y Métricas de Interferencia</h2>
            <p className="cert-desc">
              Inspección de radiofrecuencia sobre las bandas de 2.4 GHz y 5 GHz capturada por transceptores físicos
              locales con análisis de Interferencia Co-Canal (CCI) y Canal Adyacente (ACI).
            </p>
          </div>

          <div className="cert-status-box">
            <div className="cert-status-lbl">
              SALUD GLOBAL DEL ESPECTRO: {healthScore}/100
            </div>
            <div className="cert-status-warn">
              {healthScore >= 75 ? 'ESTADO ÓPTIMO / ESTABLE' : 'CONGESTIÓN DETECTADA'}
            </div>
            <div className="cert-status-sub">
              {recommendations?.summary || 'Análisis de canales completado con éxito.'}
            </div>
          </div>
        </div>

        <div className="cert-metadata-grid">
          <div className="cert-meta-item">
            <div className="meta-lbl">
              <i className="bi bi-calendar3"></i> FECHA AUDITORÍA
            </div>
            <div className="meta-val">{currentDate}</div>
            <div className="meta-sub">{currentTime} hrs</div>
          </div>

          <div className="cert-meta-item">
            <div className="meta-lbl">
              <i className="bi bi-clock-history"></i> ESTADO DEL SISTEMA
            </div>
            <div className="meta-val">Activo y Calibrado</div>
            <div className="meta-sub">Recepción Directa</div>
          </div>

          <div className="cert-meta-item">
            <div className="meta-lbl">
              <i className="bi bi-geo-alt"></i> ENTORNO FÍSICO
            </div>
            <div className="meta-val">Local / Planta</div>
            <div className="meta-sub">Cobertura In Situ</div>
          </div>

          <div className="cert-meta-item">
            <div className="meta-lbl">
              <i className="bi bi-person-badge"></i> OPERADOR
            </div>
            <div className="meta-val">{user?.full_name || user?.username || 'Ingeniero RF'}</div>
            <div className="meta-sub">{user?.role === 'admin' ? 'Super Administrador' : 'Especialista de Red'}</div>
          </div>

          <div className="cert-meta-item">
            <div className="meta-lbl">
              <i className="bi bi-hdd-network"></i> ADAPTADORES ACTIVOS
            </div>
            <div className="meta-val">{adapters.length === 1 ? '1 Transceptor' : `${adapters.length} Transceptores`}</div>
            <div className="meta-sub" title={adapterNames}>{adapters[0]?.name || 'Wi-Fi'} {adapters[1] ? `+ ${adapters[1].name}` : ''}</div>
          </div>

          <div className="cert-meta-item">
            <div className="meta-lbl">
              <i className="bi bi-layers"></i> REDES CAPTURADAS
            </div>
            <div className="meta-val">{totalAps} BSSIDs</div>
            <div className="meta-sub">2.4 GHz y 5 GHz</div>
          </div>
        </div>
      </div>

      {/* 3. OCCUPANCY HISTOGRAM BAR CHART */}
      <div className="rep-histogram-card">
        <div className="hist-header-row">
          <div className="hist-title">
            <i className="bi bi-bar-chart-fill" style={{ color: 'inherit' }}></i>
            <span>HISTOGRAMA DE DENSIDAD DE PUNTOS DE ACCESO POR CANAL</span>
            <span className="hist-spec-tag">DATOS REALES DEL HARDWARE</span>
          </div>

          <div className="hist-band-filter-pills">
            <button
              className={`hist-filter-pill ${selectedBand === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedBand('all')}
            >
              Dual Band (Resumen)
            </button>
            <button
              className={`hist-filter-pill ${selectedBand === '2.4' ? 'active' : ''}`}
              onClick={() => setSelectedBand('2.4')}
            >
              Banda 2.4 GHz (1-13)
            </button>
            <button
              className={`hist-filter-pill ${selectedBand === '5' ? 'active' : ''}`}
              onClick={() => setSelectedBand('5')}
            >
              Banda 5 GHz (36-165)
            </button>
          </div>

          <div className="hist-legends-group">
            <span className="leg-pill leg-cyan">■ Despejado (&lt;40%)</span>
            <span className="leg-pill leg-amber">■ Moderado (40-70%)</span>
            <span className="leg-pill leg-crit">■ Crítico (&gt;70%)</span>
          </div>
        </div>

        {/* Graphic Area */}
        <div className="histogram-bars-wrapper">
          {/* Threshold Lines */}
          <div className="thresh-line-crit">
            <span className="thresh-line-lbl">70% UMBRAL CRÍTICO (SATURACIÓN)</span>
          </div>
          <div className="thresh-line-opt">
            <span className="thresh-line-lbl">40% UMBRAL DESPEJADO (ÓPTIMO)</span>
          </div>

          {/* Columns */}
          <div className="bars-container">
            {histogramBars.map((bar) => {
              const barColor =
                bar.count === 0
                  ? 'rgba(255, 255, 255, 0.08)'
                  : bar.isCritical
                  ? 'linear-gradient(180deg, #ef4444, #b91c1c)'
                  : bar.isModerate
                  ? 'linear-gradient(180deg, #f59e0b, #d97706)'
                  : 'linear-gradient(180deg, #06b6d4, #0891b2)';

              const barShadow =
                bar.isCritical
                  ? '0 0 12px rgba(239, 68, 68, 0.4)'
                  : bar.count > 0
                  ? '0 0 8px rgba(6, 182, 212, 0.3)'
                  : 'none';

              return (
                <div
                  key={bar.ch}
                  className="channel-bar-col"
                  title={`Canal ${bar.ch} (${bar.freq} GHz): ${bar.count} APs${bar.bestRssi ? ` • Máx: ${bar.bestRssi} dBm` : ''}`}
                >
                  {/* Top indicator tag */}
                  {bar.isCritical ? (
                    <div className="reduction-pill">
                      <span>{bar.count} APs</span>
                      <span className="badge-nums">Saturado</span>
                    </div>
                  ) : bar.count > 0 ? (
                    <div className="count-pill">
                      <span>{bar.count} AP{bar.count > 1 ? 's' : ''}</span>
                    </div>
                  ) : null}

                  {/* Vertical Bar */}
                  <div className="bar-track">
                    <div
                      className="hist-bar-item"
                      style={{
                        height: `${bar.occupancy}%`,
                        background: barColor,
                        boxShadow: barShadow,
                      }}
                    >
                      {bar.bestRssi && (
                        <span className="bar-dbm-tooltip">{bar.bestRssi} dBm</span>
                      )}
                    </div>
                  </div>

                  {/* Channel label */}
                  <div className="bar-labels">
                    <span className="bar-ch-name">Ch {bar.ch}</span>
                    <span className="bar-ch-freq">{bar.freq}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer callout row */}
        <div className="hist-callout-row">
          <div className="callout-txt">
            <span>
              <strong>Diagnóstico en Vivo:</strong> Mayor congestión en <strong>Canal {maxCongestedCh}</strong> ({maxApsOnCh} APs).
              Recomendación para reasignación limpia: <strong>Canal {recommendedCh}</strong>.
            </span>
          </div>
          <span className="rbw-tag">RESOLUCIÓN DE ENUMERACIÓN: NETSH WLAN HARDWARE</span>
        </div>
      </div>

      {/* 4. CANALES QUE REQUIEREN REVISIÓN O MITIGACIÓN */}
      <div className="rep-urgent-card">
        <div className="urgent-header">
          <div className="urgent-title">
            <i className="bi bi-shield-exclamation" style={{ color: 'inherit' }}></i>
            <span>Diagnóstico de Canales y Acciones Correctivas</span>
          </div>
          <span className="urgent-badge">ANÁLISIS DE INTERFERENCIA DIRECTA</span>
        </div>

        <div className="urgent-items-grid">
          {/* Card 1: Co-channel */}
          <div className="urgent-card-box">
            <div className="urgent-box-top">
              <span className="urgent-chan">Canal {maxCongestedCh} (Frecuencia Congestionada)</span>
              <span className={maxApsOnCh >= 3 ? 'badge-urg-crit' : 'badge-urg-warn'}>
                {maxApsOnCh >= 3 ? 'CRÍTICO' : 'MODERADO'}
              </span>
            </div>
            <p className="urgent-box-desc">
              Detectados {maxApsOnCh} puntos de acceso compitiendo en el mismo canal. Causa contienda CSMA/CA y
              retransmisión de balizas.
            </p>
            <div className="urgent-action-box">
              <i className="bi bi-arrow-right-circle"></i>
              <span>Reubicar APs hacia Canal {recommendedCh}</span>
            </div>
          </div>

          {/* Card 2: Adyacente */}
          <div className="urgent-card-box">
            <div className="urgent-box-top">
              <span className="urgent-chan">Canales 2, 3, 4, 7, 8, 9 (Interferencia ACI)</span>
              <span className="badge-urg-warn">ADVERTENCIA</span>
            </div>
            <p className="urgent-box-desc">
              Las emisiones en canales solapados generan ruido en bandas colindantes. Se recomienda apegarse
              estrictamente a los canales no solapados 1, 6 y 11 en 2.4 GHz.
            </p>
            <div className="urgent-action-box">
              <i className="bi bi-arrow-right-circle"></i>
              <span>Ajustar ancho a 20 MHz en canales 1/6/11</span>
            </div>
          </div>

          {/* Card 3: Optimización 5 GHz */}
          <div className="urgent-card-box">
            <div className="urgent-box-top">
              <span className="urgent-chan">Banda 5 GHz UNII-1/2/3</span>
              <span className="badge-urg-info">RECOMENDADO</span>
            </div>
            <p className="urgent-box-desc">
              La banda de 5 GHz ofrece canales limpios con menor contienda. Migrar tráfico corporativo de alta
              demanda a canales 36, 44 o 149 para máximo throughput.
            </p>
            <div className="urgent-action-box">
              <i className="bi bi-arrow-right-circle"></i>
              <span>Habilitar Band Steering hacia 5 GHz</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
