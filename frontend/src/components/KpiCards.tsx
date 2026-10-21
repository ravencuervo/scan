import React from 'react';
import type { SpectrumMetrics, SpectrumRecommendations } from '../types/spectrum';
import './KpiCards.css';

interface KpiCardsProps {
  metrics: SpectrumMetrics | null;
  recommendations: SpectrumRecommendations | null;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ metrics, recommendations }) => {
  const health = metrics?.overall_health_score ?? 100;
  const totalAps = metrics?.total_aps ?? 0;
  const count24 = metrics?.aps_24ghz_count ?? 0;
  const count5 = metrics?.aps_5ghz_count ?? 0;
  const opt24 = recommendations?.optimal_channel_24 ?? 1;
  const opt5 = recommendations?.optimal_channel_5 ?? 36;

  return (
    <section className="kpi-grid">
      {/* Card 1: Salud */}
      <div className="kpi-card" style={{ ['--card-accent' as any]: 'var(--color5)' }}>
        <div className="kpi-header">
          <span className="kpi-title">Salud del Espectro</span>
          <div className="kpi-icon">
            <i className="bi bi-activity"></i>
          </div>
        </div>
        <div className="kpi-value-container">
          <span
            className="kpi-value"
            style={{
              color: health >= 75 ? 'var(--color6)' : health >= 50 ? '#fcd34d' : 'var(--color5)',
            }}
          >
            {health}%
          </span>
        </div>
        <div className="kpi-sub">Pureza espectral y bajo nivel de colisión</div>
      </div>

      {/* Card 2: Total APs */}
      <div className="kpi-card" style={{ ['--card-accent' as any]: 'var(--color4)' }}>
        <div className="kpi-header">
          <span className="kpi-title">Redes Detectadas</span>
          <div className="kpi-icon">
            <i className="bi bi-wifi"></i>
          </div>
        </div>
        <div className="kpi-value-container">
          <span className="kpi-value">{totalAps}</span>
        </div>
        <div className="kpi-sub">
          2.4 GHz: {count24} &nbsp;|&nbsp; 5 GHz: {count5}
        </div>
      </div>

      {/* Card 3: Optimal 2.4 GHz */}
      <div className="kpi-card" style={{ ['--card-accent' as any]: 'var(--color5)' }}>
        <div className="kpi-header">
          <span className="kpi-title">Canal Óptimo 2.4 GHz</span>
          <div className="kpi-icon">
            <i className="bi bi-check-circle-fill"></i>
          </div>
        </div>
        <div className="kpi-value-container">
          <span className="kpi-value" style={{ color: 'var(--color6)' }}>
            Ch {opt24}
          </span>
        </div>
        <div className="kpi-sub">Menor interferencia co-canal y adyacente</div>
      </div>

      {/* Card 4: Optimal 5 GHz */}
      <div className="kpi-card" style={{ ['--card-accent' as any]: 'var(--color3)' }}>
        <div className="kpi-header">
          <span className="kpi-title">Canal Óptimo 5 GHz</span>
          <div className="kpi-icon">
            <i className="bi bi-lightning-charge-fill"></i>
          </div>
        </div>
        <div className="kpi-value-container">
          <span className="kpi-value" style={{ color: 'var(--color6)' }}>
            Ch {opt5}
          </span>
        </div>
        <div className="kpi-sub">Máxima capacidad y ancho de banda</div>
      </div>
    </section>
  );
};
