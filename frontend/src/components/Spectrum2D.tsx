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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 30, right: 30, bottom: 45, left: 55 };

    // Solid #290854 (color1) background
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

    for (let r = minRssi; r <= maxRssi; r += 10) {
      const y = rssiToY(r);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(`${r} dBm`, 8 * dpr, y + 3 * dpr);
    }

    if (band === '2.4ghz') {
      const minFreq = 2400;
      const maxFreq = 2495;
      const freqToX = (freq: number) => {
        return padding.left + ((freq - minFreq) / (maxFreq - minFreq)) * plotWidth;
      };

      // Channel Guides
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

      // AP Parabolic Curves
      const aps24 = accessPoints.filter((ap) => ap.channel <= 14);
      aps24.forEach((ap, idx) => {
        const color = getNetworkColor(idx, ap.bssid);
        const centerFreq = CH_FREQS_24[ap.channel] || 2412;
        const halfWidthMHz = (ap.channel_width || 20) / 2 + 1;

        const peakX = freqToX(centerFreq);
        const peakY = rssiToY(ap.rssi);
        const leftX = freqToX(centerFreq - halfWidthMHz);
        const rightX = freqToX(centerFreq + halfWidthMHz);
        const baseY = rssiToY(minRssi);

        ctx.beginPath();
        ctx.moveTo(leftX, baseY);
        ctx.quadraticCurveTo(peakX, peakY, rightX, baseY);

        const gradient = ctx.createLinearGradient(0, peakY, 0, baseY);
        gradient.addColorStop(0, color + '99');
        gradient.addColorStop(1, color + '10');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.2 * dpr;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${9.5 * dpr}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        const label = ap.ssid.length > 14 ? ap.ssid.substring(0, 13) + '…' : ap.ssid;
        ctx.fillText(`${label} (${ap.rssi} dBm)`, peakX, peakY - 6 * dpr);
      });
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

      const aps5 = accessPoints.filter((ap) => ap.channel >= 36);
      aps5.forEach((ap, idx) => {
        const chIdx = CHANNELS_5G.indexOf(ap.channel);
        if (chIdx === -1) return;

        const color = getNetworkColor(idx, ap.bssid);
        const peakX = padding.left + (chIdx + 0.5) * stepX;
        const peakY = rssiToY(ap.rssi);
        const halfWidth = stepX * (ap.channel_width === 80 ? 3.5 : ap.channel_width === 40 ? 1.8 : 0.9);
        const baseY = rssiToY(minRssi);

        ctx.beginPath();
        ctx.moveTo(peakX - halfWidth, baseY);
        ctx.quadraticCurveTo(peakX, peakY, peakX + halfWidth, baseY);

        const gradient = ctx.createLinearGradient(0, peakY, 0, baseY);
        gradient.addColorStop(0, color + '99');
        gradient.addColorStop(1, color + '10');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.2 * dpr;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${9 * dpr}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        const label = ap.ssid.length > 12 ? ap.ssid.substring(0, 11) + '…' : ap.ssid;
        ctx.fillText(`${label} (${ap.rssi} dBm)`, peakX, peakY - 6 * dpr);
      });
    }
  }, [accessPoints, band]);

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} id="spectrumCanvas" />
    </div>
  );
};
