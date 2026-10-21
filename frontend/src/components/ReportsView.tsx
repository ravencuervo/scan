import React from 'react';
import './ReportsView.css';

interface ReportsViewProps {
  onExportPdf: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onExportPdf }) => {
  const channelBars = [
    { ch: 'Ch 1', freq: '2.412', base: 72, opt: 48 },
    { ch: 'Ch 2', freq: '2.417', base: 45, opt: 24 },
    { ch: 'Ch 3', freq: '2.422', base: 40, opt: 20 },
    { ch: 'Ch 4', freq: '2.427', base: 35, opt: 18 },
    { ch: 'Ch 5', freq: '2.432', base: 55, opt: 28 },
    { ch: 'Ch 6', freq: '2.437', base: 88, opt: 32, isCritical: true },
    { ch: 'Ch 7', freq: '2.442', base: 42, opt: 22 },
    { ch: 'Ch 8', freq: '2.447', base: 48, opt: 25 },
    { ch: 'Ch 9', freq: '2.452', base: 52, opt: 30 },
    { ch: 'Ch 10', freq: '2.457', base: 38, opt: 20 },
    { ch: 'Ch 11', freq: '2.462', base: 22, opt: 38 },
    { ch: 'Ch 12', freq: '2.467', base: 25, opt: 15 },
    { ch: 'Ch 13', freq: '2.472', base: 20, opt: 12 },
    { ch: 'Ch 36', freq: '5.180', base: 62, opt: 34 },
    { ch: 'Ch 40', freq: '5.200', base: 50, opt: 28 },
    { ch: 'Ch 44', freq: '5.220', base: 44, opt: 26 },
    { ch: 'Ch 48', freq: '5.240', base: 48, opt: 30 },
  ];

  return (
    <div className="reports-view-container">
      {/* 1. TOP TITLE AND ACTIONS BAR */}
      <div className="rep-header-actions-bar">
        <div className="rep-header-left">
          <i className="bi bi-file-earmark-bar-graph-fill" style={{ color: '#06b6d4' }}></i>
          <span>Informe Técnico de Espectro RF - Sesión #SES-2025-0512-B</span>
        </div>

        <div className="rep-header-btns">
          <button className="btn-rep-pdf" onClick={onExportPdf}>
            <i className="bi bi-file-earmark-pdf"></i> Exportar Informe PDF
          </button>
          <button className="btn-rep-excel">
            <i className="bi bi-file-earmark-excel"></i> Exportar Datos Excel (XLSX)
          </button>
          <button className="btn-rep-icon" title="Imprimir informe">
            <i className="bi bi-printer"></i>
          </button>
        </div>
      </div>

      {/* 2. OFFICIAL AUDIT METADATA CARD */}
      <div className="rep-certificate-card">
        <div className="cert-top-row">
          <div>
            <div className="cert-sub-badge">REPORTE OFICIAL CERTIFICADO</div>
            <h2 className="cert-main-title">Auditoría de Ocupación e Interferencia Espectral</h2>
            <p className="cert-desc">
              Inspección radioeléctrica pasiva y cálculo de densidad espectral de potencia en las bandas no licenciadas de 2.400-2.4835 GHz y 5.150-5.850 GHz para remediación de congestión física de celdas Wi-Fi.
            </p>
          </div>

          <div className="cert-status-box">
            <div className="cert-status-lbl">
              <span className="dot-amber"></span> ESTADO DE ESPECTRO: MODERADO
            </div>
            <div className="cert-status-warn">CON RECOMENDACIONES CRÍTICAS</div>
            <div className="cert-status-sub">Requiere balanceo urgente en 3 celdas (Ch 6 / Ch 1).</div>
          </div>
        </div>

        <div className="cert-metadata-grid">
          <div className="cert-meta-item">
            <div className="meta-lbl">
              <i className="bi bi-calendar3"></i> FECHA AUDITORÍA
            </div>
            <div className="meta-val">12 Mayo 2025</div>
            <div className="meta-sub">Hora local: 14:32 CEST</div>
          </div>

          <div className="cert-meta-item">
            <div className="meta-lbl">
              <i className="bi bi-clock-history"></i> DURACIÓN TOTAL
            </div>
            <div className="meta-val">45 min</div>
            <div className="meta-sub">Adquisición continua</div>
          </div>

          <div className="cert-meta-item">
            <div className="meta-lbl">
              <i className="bi bi-geo-alt"></i> UBICACIÓN FÍSICA
            </div>
            <div className="meta-val">Campus Central</div>
            <div className="meta-sub">Sector Ala Norte (Niveles 2-4)</div>
          </div>

          <div className="cert-meta-item">
            <div className="meta-lbl">
              <i className="bi bi-person-badge"></i> OPERADOR RESPONSABLE
            </div>
            <div className="meta-val">Ing. M. Santillán</div>
            <div className="meta-sub">Cert. CWNA-108 #4412</div>
          </div>

          <div className="cert-meta-item">
            <div className="meta-lbl">
              <i className="bi bi-router"></i> ADAPTADOR SDR
            </div>
            <div className="meta-val">RTL8812AU / HackRF</div>
            <div className="meta-sub">Antena Dipolo 2.4/5GHz 5dBi</div>
          </div>

          <div className="cert-meta-item">
            <div className="meta-lbl">
              <i className="bi bi-layers"></i> TRAMAS ANALIZADAS
            </div>
            <div className="meta-val">412,898</div>
            <div className="meta-sub">802.11a/b/g/n/ac/ax</div>
          </div>
        </div>
      </div>

      {/* 3. OCCUPANCY HISTOGRAM BAR CHART */}
      <div className="rep-histogram-card">
        <div className="hist-header-row">
          <div className="hist-title">
            <i className="bi bi-bar-chart-fill" style={{ color: '#06b6d4' }}></i>
            <span>HISTOGRAMA DE OCUPACIÓN ESTIMADA POR CANAL</span>
            <span className="hist-spec-tag">ESPECTRO TOTAL 2.4 & 5 GHz</span>
          </div>

          <div className="hist-legends-group">
            <span className="leg-pill leg-purple">■ Sesión Base A (Histórico)</span>
            <span className="leg-pill leg-cyan">■ Sesión Optimizada B (Actual)</span>
            <span className="thresh-txt" style={{ color: '#f87171' }}>--- Umbral Crítico (70%)</span>
            <span className="thresh-txt" style={{ color: '#34d399' }}>--- Umbral Óptimo (40%)</span>
          </div>
        </div>

        {/* The Graphic Bar Chart Area */}
        <div className="histogram-bars-wrapper">
          {/* Dotted lines */}
          <div className="thresh-line-crit" style={{ bottom: '70%' }}>
            <span className="thresh-line-lbl">70% CRÍTICO / SATURACIÓN</span>
          </div>
          <div className="thresh-line-opt" style={{ bottom: '40%' }}>
            <span className="thresh-line-lbl">40% UMBRAL ÓPTIMO RECOMENDADO</span>
          </div>

          <div className="bars-container">
            {channelBars.map((item) => (
              <div key={item.ch} className="channel-bar-col">
                {/* Critical pill on Ch 6 */}
                {item.isCritical && (
                  <div className="reduction-pill">
                    <span>REDUCCIÓN CRÍTICA -56%</span>
                    <span className="badge-nums">88% → 32%</span>
                  </div>
                )}

                <div className="dual-bars-track">
                  {/* Base Bar (Purple) */}
                  <div
                    className="bar-base"
                    style={{ height: `${item.base}%` }}
                    title={`Base: ${item.base}%`}
                  ></div>
                  {/* Opt Bar (Cyan) */}
                  <div
                    className="bar-opt"
                    style={{ height: `${item.opt}%` }}
                    title={`Optimizado: ${item.opt}%`}
                  ></div>
                </div>

                <div className="bar-labels">
                  <span className="bar-ch-name">{item.ch}</span>
                  <span className="bar-ch-freq">{item.freq}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hist-callout-row">
          <div className="callout-txt">
            <i className="bi bi-info-circle-fill" style={{ color: '#06b6d4' }}></i>
            <span>
              <strong>Evidencia directa:</strong> El Canal 6 redujo su congestión del 88% al 32% tras migrar 8 BSSIDs a Canal 11 (elevado de forma controlada a 38%).
            </span>
          </div>
          <span className="rbw-tag">ANCHO DE BANDA DE RESOLUCIÓN (RBW): 100 kHz</span>
        </div>
      </div>

      {/* 4. CANALES QUE REQUIEREN REVISIÓN URGENTE */}
      <div className="rep-urgent-card">
        <div className="urgent-header">
          <div className="urgent-title">
            <i className="bi bi-exclamation-triangle-fill" style={{ color: '#ef4444' }}></i>
            <span>Canales que Requieren Revisión Urgente</span>
          </div>
          <span className="urgent-badge">3 ANOMALÍAS EN LISTA DE ACCIÓN PRIORITARIA</span>
        </div>

        <div className="urgent-items-grid">
          <div className="urgent-card-box">
            <div className="urgent-box-top">
              <span className="urgent-chan">Canal 6 (2.437 GHz)</span>
              <span className="badge-urg-crit">ALTA CONGESTIÓN</span>
            </div>
            <p className="urgent-box-desc">
              16 APs solapados generando un 32% de tramas retransmitidas y degradación de throughput.
            </p>
            <div className="urgent-action-box">
              <i className="bi bi-arrow-right-short"></i>
              <span>Acción: Desplazar 8 APs secundarios hacia Canal 11.</span>
            </div>
          </div>

          <div className="urgent-card-box">
            <div className="urgent-box-top">
              <span className="urgent-chan">Canal 1 (2.412 GHz)</span>
              <span className="badge-urg-warn">INTERFERENCIA NO-802.11</span>
            </div>
            <p className="urgent-box-desc">
              Emisión electromagnética sostenida compatible con horno microondas industrial en el campus.
            </p>
            <div className="urgent-action-box">
              <i className="bi bi-arrow-right-short"></i>
              <span>Acción: Blindaje electromagnético o reubicación de celda.</span>
            </div>
          </div>

          <div className="urgent-card-box">
            <div className="urgent-box-top">
              <span className="urgent-chan">Canal 36 (5.180 GHz)</span>
              <span className="badge-urg-info">POTENCIA EXCESIVA</span>
            </div>
            <p className="urgent-box-desc">
              Potencia de Tx a 22 dBm saturando receptores de clientes a corta distancia en nivel 2.
            </p>
            <div className="urgent-action-box">
              <i className="bi bi-arrow-right-short"></i>
              <span>Acción: Atenuar potencia de transmisión a 14 dBm.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
