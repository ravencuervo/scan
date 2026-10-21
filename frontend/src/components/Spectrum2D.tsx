import React, { useEffect, useRef } from 'react';
import type { ScannedAP } from '../types/spectrum';
import './Spectrum2D.css';

interface Spectrum2DProps {
  accessPoints: ScannedAP[];
  band: '2.4ghz' | '5ghz';
}

const NETWORK_COLORS = [
  '#865db1', // color5
  '#a879e6', // light lavender
  '#6f489a', // color4
  '#c49cf5', // bright lilac
  '#ffffff', // color6 (white)
  '#b388eb', // soft purple
  '#e0c7ff', // pastel purple
  '#9d6ad9', // amethyst
  '#d7bbfb', // pale violet
  '#583383', // color3
];

function getNetworkColor(index: number, bssid: string): string {
  if (bssid) {
    let hash = 0;
    for (let i = 0; i < bssid.length; i++) {
      hash = (hash << 5) - hash + bssid.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % NETWORK_COLORS.length;
    return NETWORK_COLORS[idx];
  }
  return NETWORK_COLORS[index % NETWORK_COLORS.length];
}

const CH_FREQS_24: Record<number, number> = {
  1: 2412, 2: 2417, 3: 2422, 4: 2427, 5: 2432,
  6: 2437, 7: 2442, 8: 2447, 9: 2452, 10: 2457,
  11: 2462, 12: 2467, 13: 2472, 14: 2484
};

const CHANNELS_5G = [
  36, 40, 44, 48, 52, 56, 60, 64,
  100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144,
  149, 153, 157, 161, 165
];

export const Spectrum2D: React.FC<Spectrum2DProps> = ({ accessPoints, band }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const accessPointsRef = useRef(accessPoints);
  accessPointsRef.current = accessPoints;
  const bandRef = useRef(band);
  bandRef.current = band;

  interface Smoothed2DCurve {
    key: string;
    bssid: string;
    ssid: string;
    channel: number;
    channelWidth: number;
    currentRssi: number;
    targetRssi: number;
    opacity: number;
    targetOpacity: number;
    color: string;
    band: '2.4ghz' | '5ghz';
  }

  const smoothedCurvesRef = useRef<Map<string, Smoothed2DCurve>>(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.floor(rect.width * dpr);
      const targetH = Math.floor(rect.height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const width = canvas.width;
      const height = canvas.height;
      const padding = { top: 30 * dpr, right: 30 * dpr, bottom: 45 * dpr, left: 55 * dpr };

      // Solid #290854 background
      ctx.fillStyle = '#290854';
      ctx.fillRect(0, 0, width, height);

      const plotWidth = width - padding.left - padding.right;
      const plotHeight = height - padding.top - padding.bottom;

      const minRssi = -100;
      const maxRssi = -30;

      const rssiToY = (rssi: number) => {
        const clamped = Math.max(minRssi, Math.min(maxRssi, rssi));
        const normalized = (clamped - minRssi) / (maxRssi - minRssi);
        return padding.top + plotHeight * (1 - normalized);
      };

      // Horizontal dBm Grid Lines with subtle color3
      ctx.strokeStyle = 'rgba(88, 51, 131, 0.4)';
      ctx.lineWidth = 1;
      ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#d5c4ec';
      ctx.textAlign = 'right';

      for (let r = minRssi; r <= maxRssi; r += 10) {
        const y = rssiToY(r);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillText(`${r} dBm`, padding.left - 6 * dpr, y + 3 * dpr);
      }

      const currentBand = bandRef.current;
      const aps = accessPointsRef.current;

      // 1. Update curve target states
      const activeKeys = new Set<string>();

      aps.forEach((ap, idx) => {
        const apBand: '2.4ghz' | '5ghz' = ap.channel <= 14 ? '2.4ghz' : '5ghz';
        const key = ap.bssid || `${ap.ssid}_${ap.channel}`;
        const isCurrentBand = apBand === currentBand;

        if (isCurrentBand) {
          activeKeys.add(key);
        }

        const existing = smoothedCurvesRef.current.get(key);
        if (!existing) {
          if (isCurrentBand) {
            smoothedCurvesRef.current.set(key, {
              key,
              bssid: ap.bssid,
              ssid: ap.ssid,
              channel: ap.channel,
              channelWidth: ap.channel_width || 20,
              currentRssi: -100,
              targetRssi: ap.rssi,
              opacity: 0,
              targetOpacity: 1,
              color: getNetworkColor(idx, ap.bssid),
              band: apBand,
            });
          }
        } else {
          existing.targetRssi = ap.rssi;
          existing.channel = ap.channel;
          existing.channelWidth = ap.channel_width || 20;
          existing.ssid = ap.ssid;
          existing.targetOpacity = isCurrentBand ? 1 : 0;
          if (!isCurrentBand) {
            existing.targetRssi = -100;
          }
        }
      });

      // Mark unreferenced curves to fade out
      smoothedCurvesRef.current.forEach((c, k) => {
        if (!activeKeys.has(k)) {
          c.targetRssi = -100;
          c.targetOpacity = 0;
        }
      });

      // 2. Render X-Axis channel guides
      if (currentBand === '2.4ghz') {
        const minFreq = 2400;
        const maxFreq = 2495;
        const freqToX = (freq: number) => {
          return padding.left + ((freq - minFreq) / (maxFreq - minFreq)) * plotWidth;
        };

        for (let ch = 1; ch <= 14; ch++) {
          const centerFreq = CH_FREQS_24[ch];
          const x = freqToX(centerFreq);
          const isStandard = ch === 1 || ch === 6 || ch === 11;

          ctx.strokeStyle = isStandard ? 'rgba(134, 93, 177, 0.45)' : 'rgba(88, 51, 131, 0.25)';
          ctx.setLineDash([3 * dpr, 4 * dpr]);
          ctx.beginPath();
          ctx.moveTo(x, padding.top);
          ctx.lineTo(x, padding.top + plotHeight);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = isStandard ? '#865db1' : '#d5c4ec';
          ctx.font = isStandard ? `bold ${11 * dpr}px Inter, sans-serif` : `${10 * dpr}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(`Ch ${ch}`, x, height - padding.bottom + 16 * dpr);
          ctx.font = `${8.5 * dpr}px 'JetBrains Mono', monospace`;
          ctx.fillText(`${centerFreq}`, x, height - padding.bottom + 28 * dpr);
        }

        // Render interpolated curves
        const toDelete: string[] = [];
        smoothedCurvesRef.current.forEach((c, k) => {
          c.currentRssi += (c.targetRssi - c.currentRssi) * 0.08;
          c.opacity += (c.targetOpacity - c.opacity) * 0.08;

          if (c.opacity < 0.01 && c.targetOpacity === 0) {
            toDelete.push(k);
            return;
          }

          if (c.opacity > 0.01 && c.band === '2.4ghz') {
            const centerFreq = CH_FREQS_24[c.channel] || 2412;
            const halfWidthMHz = c.channelWidth / 2 + 1;

            const peakX = freqToX(centerFreq);
            const peakY = rssiToY(c.currentRssi);
            const leftX = freqToX(centerFreq - halfWidthMHz);
            const rightX = freqToX(centerFreq + halfWidthMHz);
            const baseY = rssiToY(minRssi);

            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, c.opacity));

            ctx.beginPath();
            ctx.moveTo(leftX, baseY);
            ctx.quadraticCurveTo(peakX, peakY, rightX, baseY);

            const gradient = ctx.createLinearGradient(0, peakY, 0, baseY);
            gradient.addColorStop(0, c.color + '99');
            gradient.addColorStop(1, c.color + '10');
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.strokeStyle = c.color;
            ctx.lineWidth = 2.2 * dpr;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${9.5 * dpr}px 'Inter', sans-serif`;
            ctx.textAlign = 'center';
            const label = c.ssid.length > 14 ? c.ssid.substring(0, 13) + '…' : c.ssid;
            ctx.fillText(`${label} (${Math.round(c.currentRssi)} dBm)`, peakX, peakY - 6 * dpr);

            ctx.restore();
          }
        });

        toDelete.forEach((k) => smoothedCurvesRef.current.delete(k));
      } else {
        // 5 GHz
        const stepX = plotWidth / CHANNELS_5G.length;
        CHANNELS_5G.forEach((ch, idx) => {
          const x = padding.left + (idx + 0.5) * stepX;
          ctx.strokeStyle = 'rgba(88, 51, 131, 0.25)';
          ctx.beginPath();
          ctx.moveTo(x, padding.top);
          ctx.lineTo(x, padding.top + plotHeight);
          ctx.stroke();

          ctx.fillStyle = '#d5c4ec';
          ctx.font = `${9 * dpr}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(ch.toString(), x, height - padding.bottom + 16 * dpr);
        });

        const toDelete: string[] = [];
        smoothedCurvesRef.current.forEach((c, k) => {
          c.currentRssi += (c.targetRssi - c.currentRssi) * 0.08;
          c.opacity += (c.targetOpacity - c.opacity) * 0.08;

          if (c.opacity < 0.01 && c.targetOpacity === 0) {
            toDelete.push(k);
            return;
          }

          if (c.opacity > 0.01 && c.band === '5ghz') {
            const chIdx = CHANNELS_5G.indexOf(c.channel);
            if (chIdx !== -1) {
              const peakX = padding.left + (chIdx + 0.5) * stepX;
              const peakY = rssiToY(c.currentRssi);
              const halfWidth = stepX * (c.channelWidth === 80 ? 3.5 : c.channelWidth === 40 ? 1.8 : 0.9);
              const baseY = rssiToY(minRssi);

              ctx.save();
              ctx.globalAlpha = Math.max(0, Math.min(1, c.opacity));

              ctx.beginPath();
              ctx.moveTo(peakX - halfWidth, baseY);
              ctx.quadraticCurveTo(peakX, peakY, peakX + halfWidth, baseY);

              const gradient = ctx.createLinearGradient(0, peakY, 0, baseY);
              gradient.addColorStop(0, c.color + '99');
              gradient.addColorStop(1, c.color + '10');
              ctx.fillStyle = gradient;
              ctx.fill();

              ctx.strokeStyle = c.color;
              ctx.lineWidth = 2.2 * dpr;
              ctx.stroke();

              ctx.fillStyle = '#ffffff';
              ctx.font = `bold ${9 * dpr}px Inter, sans-serif`;
              ctx.textAlign = 'center';
              const label = c.ssid.length > 12 ? c.ssid.substring(0, 11) + '…' : c.ssid;
              ctx.fillText(`${label} (${Math.round(c.currentRssi)} dBm)`, peakX, peakY - 6 * dpr);

              ctx.restore();
            }
          }
        });

        toDelete.forEach((k) => smoothedCurvesRef.current.delete(k));
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} id="spectrumCanvas" />
    </div>
  );
};

