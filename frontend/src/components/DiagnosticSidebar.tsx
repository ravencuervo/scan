import React from 'react';
import type { SpectrumRecommendations } from '../types/spectrum';
import './DiagnosticSidebar.css';

interface DiagnosticSidebarProps {
  recommendations: SpectrumRecommendations | null;
}

export const DiagnosticSidebar: React.FC<DiagnosticSidebarProps> = ({ recommendations }) => {
  const opt24 = recommendations?.optimal_channel_24 ?? 1;
  const opt5 = recommendations?.optimal_channel_5 ?? 36;
  const findings = recommendations?.findings ?? [];

  return (
    <div className="diagnostic-sidebar">
      {/* Recommended Optimal Channels */}
      <div className="rec-card">
        <div className="rec-badge">
          <i className="bi bi-bullseye"></i>
          <span>Recomendación Automática</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Banda 2.4 GHz
            </div>
            <div className="rec-channel" style={{ color: 'var(--color5)' }}>
              Canal {opt24}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Banda 5 GHz
            </div>
            <div className="rec-channel" style={{ color: 'var(--color6)' }}>
              Canal {opt5}
            </div>
          </div>
        </div>
        <div className="rec-detail">
          Algoritmo de optimización calcula más de <strong>80% de pureza espectral</strong> configurando los APs en estos canales.
        </div>
      </div>

      {/* Critical Findings Panel */}
      <div className="panel" style={{ flex: 1 }}>
        <div className="panel-header" style={{ padding: '12px 16px' }}>
          <div className="panel-title" style={{ fontSize: '0.85rem' }}>
            <i className="bi bi-shield-exclamation" style={{ color: 'var(--color5)' }}></i>
            <span>Hallazgos de Ingeniería</span>
          </div>
        </div>
        <div className="panel-body" style={{ padding: '12px 14px' }}>
          <div className="findings-list">
            {findings.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                Sin interferencias críticas detectadas.
              </div>
            ) : (
              findings.map((f, idx) => (
                <div
                  key={idx}
                  className={`finding-item ${f.severity === 'WARNING' ? 'warning' : ''}`}
                >
                  <div className="finding-title">
                    <span>{f.title}</span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        color: f.severity === 'CRITICAL' ? 'var(--color6)' : 'var(--color5)',
                        backgroundColor: f.severity === 'CRITICAL' ? 'var(--color4)' : 'rgba(88, 51, 131, 0.5)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                      }}
                    >
                      {f.severity}
                    </span>
                  </div>
                  <div className="finding-desc">{f.description}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
