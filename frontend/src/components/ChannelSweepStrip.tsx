import React from 'react';
import type { ScannedAP } from '../types/spectrum';
import './ChannelSweepStrip.css';

interface ChannelSweepStripProps {
  accessPoints: ScannedAP[];
}

interface ChannelDef {
  ch: number;
  freq: string;
  isDfs?: boolean;
  defaultStatus: 'clear' | 'moderate' | 'high';
}

const CHANNELS_CONFIG: ChannelDef[] = [
  { ch: 1, freq: '2.412G', defaultStatus: 'moderate' },
  { ch: 6, freq: '2.437G', defaultStatus: 'high' },
  { ch: 11, freq: '2.462G', defaultStatus: 'moderate' },
  { ch: 36, freq: '5.180G', defaultStatus: 'clear' },
  { ch: 40, freq: '5.200G', defaultStatus: 'clear' },
  { ch: 44, freq: '5.220G', defaultStatus: 'clear' },
  { ch: 48, freq: '5.240G', defaultStatus: 'clear' },
  { ch: 52, freq: 'DFS', isDfs: true, defaultStatus: 'moderate' },
  { ch: 100, freq: 'DFS', isDfs: true, defaultStatus: 'clear' },
  { ch: 149, freq: '5.745G', defaultStatus: 'moderate' },
  { ch: 157, freq: '5.785G', defaultStatus: 'clear' },
  { ch: 165, freq: '5.825G', defaultStatus: 'clear' },
];

export const ChannelSweepStrip: React.FC<ChannelSweepStripProps> = ({ accessPoints }) => {
  const getChannelColor = (status: 'clear' | 'moderate' | 'high') => {
    switch (status) {
      case 'clear':
        return '#10b981'; // Green
      case 'moderate':
        return '#f59e0b'; // Amber
      case 'high':
        return '#ef4444'; // Red
    }
  };

  return (
    <div className="channel-sweep-panel">
      {/* Header */}
      <div className="channel-sweep-header">
        <div className="channel-sweep-title">
          <i className="bi bi-disc"></i>
          <span>
            Monitor de Canales en Barrido Rotativo (Banda 2.4 GHz & 5 GHz UNII-1/2/3)
          </span>
        </div>

        <div className="sweep-active-badge">
          <span>BARRIDO ACTIVO: CH 36 → CH 165</span>
        </div>

        <div className="sweep-legend-group">
          <div className="sweep-legend-item">
            <span
              className="sweep-legend-dot"
              style={{ backgroundColor: '#10b981' }}
            ></span>
            <span>CANAL DESPEJADO</span>
          </div>

          <div className="sweep-legend-item">
            <span
              className="sweep-legend-dot"
              style={{ backgroundColor: '#f59e0b' }}
            ></span>
            <span>CONGESTIÓN MODERADA</span>
          </div>

          <div className="sweep-legend-item">
            <span
              className="sweep-legend-dot"
              style={{ backgroundColor: '#ef4444' }}
            ></span>
            <span>ALTA INTERFERENCIA</span>
          </div>
        </div>
      </div>

      {/* Grid of channels */}
      <div className="channel-cells-container">
        {CHANNELS_CONFIG.map((item) => {
          const matchingAps = accessPoints.filter((ap) => ap.channel === item.ch);
          const apCount = matchingAps.length;
          const bestRssi = matchingAps.length > 0 ? Math.max(...matchingAps.map((a) => a.rssi)) : null;

          const strongestAp = accessPoints.length > 0
            ? accessPoints.reduce((prev, curr) => (curr.rssi > prev.rssi ? curr : prev), accessPoints[0])
            : null;
          const isActive = strongestAp ? strongestAp.channel === item.ch : false;

          let status: 'clear' | 'moderate' | 'high' = 'clear';
          if (apCount >= 4) status = 'high';
          else if (apCount >= 2) status = 'moderate';
          else status = 'clear';

          return (
            <div
              key={item.ch}
              className={`channel-cell ${isActive ? 'active-channel' : ''}`}
            >
              {isActive && <span className="actual-pill-tag">MÁS POTENTE</span>}

              <div className="channel-cell-top">
                <span className="cell-ch-num">CH {item.ch}</span>
                <span className="cell-ch-freq">{item.freq}</span>
              </div>

              {apCount > 0 ? (
                <div className="cell-stats-center">
                  <span className="cell-dbm-txt">{bestRssi} dBm</span>
                  <span className="cell-ap-count">{apCount} {apCount === 1 ? 'AP' : 'APs'}</span>
                </div>
              ) : (
                <div className="cell-stats-center">
                  <span className="cell-ap-count" style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>
                    0 APs (Libre)
                  </span>
                </div>
              )}

              <div
                className="channel-congestion-bar"
                style={{ backgroundColor: getChannelColor(status) }}
              ></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
