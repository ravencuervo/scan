/**
 * AeroScan Spectrum Intelligence Dashboard — Solid Palette Edition
 * Palette:
 *   .color1: #02031a (Deep Navy/Black)
 *   .color2: #021b2b (Midnight Blue Surface)
 *   .color3: #b10c43 (Deep Ruby Accent)
 *   .color4: #ff0841 (Electric Neon Red)
 *   .color5: #ebdfcc (Parchment Cream)
 */

// Global State
const appState = {
  currentTab: "2.4ghz", // "2.4ghz", "5ghz", "waterfall"
  bandFilter: "all",    // "all", "2.4ghz", "5ghz"
  searchQuery: "",
  accessPoints: [],
  metrics: null,
  recommendations: null,
  socket: null,
  waterfallHistory: [],
  currentUser: null,
  token: localStorage.getItem("aeroscan_token") || null
};

// Saturated high-contrast color palette for wireless curves on dark background
const NETWORK_COLORS = [
  "#ff0841", "#b10c43", "#ff3366", "#e60039", "#ff6b8b",
  "#ebdfcc", "#ff4d6d", "#c9184a", "#ff758f", "#a4133c",
  "#f43f5e", "#fb7185", "#e11d48", "#be123c", "#9f1239"
];

function getNetworkColor(index, bssid) {
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

// --------------------------------------------------------------------------
// Authentication System (Login / Logout)
// --------------------------------------------------------------------------
async function checkAuthStatus() {
  const token = localStorage.getItem("aeroscan_token");
  if (!token) {
    showLoginOverlay();
    return;
  }

  try {
    const res = await fetch(`/api/auth/me?token=${encodeURIComponent(token)}`);
    if (res.ok) {
      const data = await res.json();
      appState.currentUser = data.user;
      hideLoginOverlay();
      updateUserUI();
      if (!appState.socket || appState.socket.readyState !== WebSocket.OPEN) {
        connectWebSocket();
      }
    } else {
      localStorage.removeItem("aeroscan_token");
      showLoginOverlay();
    }
  } catch (err) {
    console.warn("[AeroScan] Error verificando autenticación:", err);
    showLoginOverlay();
  }
}

function showLoginOverlay() {
  const overlay = document.getElementById("loginOverlay");
  if (overlay) overlay.classList.remove("hidden");
}

function hideLoginOverlay() {
  const overlay = document.getElementById("loginOverlay");
  if (overlay) overlay.classList.add("hidden");
}

function updateUserUI() {
  const userText = document.getElementById("userNameText");
  if (userText && appState.currentUser) {
    userText.textContent = `👤 ${appState.currentUser.full_name} (${appState.currentUser.role.toUpperCase()})`;
  }
}

function fillQuickLogin(user, pass) {
  document.getElementById("loginUsername").value = user;
  document.getElementById("loginPassword").value = pass;
  document.getElementById("loginError").style.display = "none";
  document.getElementById("btnLoginSubmit").focus();
}

async function submitLogin() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const errorBox = document.getElementById("loginError");
  const btn = document.getElementById("btnLoginSubmit");

  errorBox.style.display = "none";
  btn.disabled = true;
  btn.textContent = "Verificando credenciales...";

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("aeroscan_token", data.token);
      appState.token = data.token;
      appState.currentUser = data.user;
      hideLoginOverlay();
      updateUserUI();
      connectWebSocket();
    } else {
      const errData = await res.json().catch(() => ({}));
      errorBox.textContent = errData.detail || "Credenciales incorrectas.";
      errorBox.style.display = "block";
    }
  } catch (err) {
    errorBox.textContent = "Error de conexión con el servidor.";
    errorBox.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg> Ingresar al Sistema`;
  }
}

async function logoutUser() {
  const token = localStorage.getItem("aeroscan_token");
  if (token) {
    fetch(`/api/auth/logout?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => {});
  }
  localStorage.removeItem("aeroscan_token");
  appState.token = null;
  appState.currentUser = null;
  showLoginOverlay();
}

// --------------------------------------------------------------------------
// WebSocket Telemetry Connection
// --------------------------------------------------------------------------
function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/spectrum`;
  
  if (appState.socket && appState.socket.readyState === WebSocket.OPEN) {
    return;
  }

  appState.socket = new WebSocket(wsUrl);

  appState.socket.onopen = () => {
    console.log("[AeroScan] WebSocket conectado a telemetría.");
    const liveBadge = document.getElementById("liveBadge");
    if (liveBadge) {
      liveBadge.classList.add("badge-live");
      document.getElementById("liveStatusText").textContent = "EN VIVO";
    }
  };

  appState.socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "telemetry_update") {
        updateTelemetryData(data);
      }
    } catch (err) {
      console.error("[AeroScan] Error procesando telemetría:", err);
    }
  };

  appState.socket.onclose = () => {
    console.warn("[AeroScan] WebSocket desconectado. Reintentando en 3s...");
    const statusText = document.getElementById("liveStatusText");
    if (statusText) statusText.textContent = "RECONECTANDO...";
    setTimeout(connectWebSocket, 3000);
  };
}

// --------------------------------------------------------------------------
// Telemetry Updates
// --------------------------------------------------------------------------
function updateTelemetryData(data) {
  appState.accessPoints = data.access_points || [];
  appState.metrics = data.metrics || {};
  appState.recommendations = data.recommendations || {};

  // Engine badge
  const engineText = (data.engine_type || "windows").toUpperCase();
  const engineBadge = document.getElementById("engineBadge");
  if (engineBadge) engineBadge.textContent = `MOTOR: ${engineText}`;

  updateKPIs();
  updateRecommendationsSidebar();
  pushWaterfallFrame();
  renderActiveCanvas();
  renderNetworksTable();
}

function updateKPIs() {
  const m = appState.metrics || {};
  const r = appState.recommendations || {};

  // Health Score
  const health = m.overall_health_score !== undefined ? m.overall_health_score : 100;
  const healthEl = document.getElementById("kpiHealth");
  if (healthEl) {
    healthEl.textContent = `${health}%`;
    healthEl.style.color = health >= 75 ? "var(--color4)" : (health >= 50 ? "var(--accent-warning)" : "var(--color3)");
  }

  // APs count
  const countEl = document.getElementById("kpiTotalAps");
  if (countEl) countEl.textContent = m.total_aps || appState.accessPoints.length;

  const countSubEl = document.getElementById("kpiTotalApsSub");
  if (countSubEl) {
    countSubEl.textContent = `2.4 GHz: ${m.aps_24ghz_count || 0}  |  5 GHz: ${m.aps_5ghz_count || 0}`;
  }

  // Optimal channels
  const opt24El = document.getElementById("kpiOpt24");
  if (opt24El) opt24El.textContent = `Ch ${r.optimal_channel_24 || 1}`;

  const opt5El = document.getElementById("kpiOpt5");
  if (opt5El) opt5El.textContent = `Ch ${r.optimal_channel_5 || 36}`;
}

function updateRecommendationsSidebar() {
  const r = appState.recommendations || {};
  
  const best24 = document.getElementById("recChannel24");
  if (best24) best24.textContent = `Canal ${r.optimal_channel_24 || 1}`;

  const best5 = document.getElementById("recChannel5");
  if (best5) best5.textContent = `Canal ${r.optimal_channel_5 || 36}`;

  const findingsContainer = document.getElementById("findingsList");
  if (findingsContainer && r.findings) {
    findingsContainer.innerHTML = "";
    if (r.findings.length === 0) {
      findingsContainer.innerHTML = `<div style="font-size:0.75rem; color:var(--text-dim); text-align:center; padding:12px;">Sin interferencias críticas detectadas.</div>`;
    } else {
      r.findings.forEach(f => {
        const item = document.createElement("div");
        item.className = `finding-item ${f.severity === 'WARNING' ? 'warning' : ''}`;
        item.innerHTML = `
          <div class="finding-title">
            <span>${escapeHtml(f.title)}</span>
            <span style="font-size:0.68rem; color:${f.severity === 'CRITICAL' ? 'var(--color4)' : 'var(--color3)'}">${f.severity}</span>
          </div>
          <div class="finding-desc">${escapeHtml(f.description)}</div>
        `;
        findingsContainer.appendChild(item);
      });
    }
  }
}

// --------------------------------------------------------------------------
// Spectrum 2.4 GHz Canvas Renderer (Parabolic RF Curves)
// --------------------------------------------------------------------------
function render24GhzSpectrum(canvas, ctx) {
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 30, right: 30, bottom: 45, left: 55 };

  // Fill canvas solid background: #02031a
  ctx.fillStyle = "#02031a";
  ctx.fillRect(0, 0, width, height);

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const minRssi = -100;
  const maxRssi = -30;

  function rssiToY(rssi) {
    const clamped = Math.max(minRssi, Math.min(maxRssi, rssi));
    const normalized = (clamped - minRssi) / (maxRssi - minRssi);
    return padding.top + plotHeight * (1 - normalized);
  }

  const minFreq = 2400;
  const maxFreq = 2495;

  function freqToX(freq) {
    return padding.left + ((freq - minFreq) / (maxFreq - minFreq)) * plotWidth;
  }

  // Draw grid & dBm axis
  ctx.strokeStyle = "rgba(235, 223, 204, 0.08)";
  ctx.lineWidth = 1;
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#8f8576";

  for (let r = minRssi; r <= maxRssi; r += 10) {
    const y = rssiToY(r);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${r} dBm`, 8, y + 3);
  }

  const CH_FREQS = {
    1: 2412, 2: 2417, 3: 2422, 4: 2427, 5: 2432,
    6: 2437, 7: 2442, 8: 2447, 9: 2452, 10: 2457,
    11: 2462, 12: 2467, 13: 2472, 14: 2484
  };

  // Channel Guides
  for (let ch = 1; ch <= 14; ch++) {
    const centerFreq = CH_FREQS[ch];
    const x = freqToX(centerFreq);
    const isStandard = (ch === 1 || ch === 6 || ch === 11);

    ctx.strokeStyle = isStandard ? "rgba(255, 8, 65, 0.35)" : "rgba(235, 223, 204, 0.05)";
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    // Channel label
    ctx.fillStyle = isStandard ? "#ff0841" : "#c5baa8";
    ctx.font = isStandard ? "bold 11px Inter, sans-serif" : "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Ch ${ch}`, x, height - padding.bottom + 16);
    ctx.font = "8.5px 'JetBrains Mono', monospace";
    ctx.fillText(`${centerFreq}`, x, height - padding.bottom + 28);
  }

  // Draw AP parabolic curves
  const aps24 = appState.accessPoints.filter(ap => ap.channel <= 14);

  aps24.forEach((ap, idx) => {
    const color = getNetworkColor(idx, ap.bssid);
    const centerFreq = CH_FREQS[ap.channel] || 2412;
    const halfWidthMHz = (ap.channel_width || 20) / 2 + 1;
    
    const peakX = freqToX(centerFreq);
    const peakY = rssiToY(ap.rssi);
    const leftX = freqToX(centerFreq - halfWidthMHz);
    const rightX = freqToX(centerFreq + halfWidthMHz);
    const baseY = rssiToY(minRssi);

    ctx.beginPath();
    ctx.moveTo(leftX, baseY);
    ctx.quadraticCurveTo(peakX, peakY, rightX, baseY);

    // Gradient fill using solid color tones
    const gradient = ctx.createLinearGradient(0, peakY, 0, baseY);
    gradient.addColorStop(0, color + "77");
    gradient.addColorStop(1, color + "08");
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Peak Label in #ebdfcc
    ctx.fillStyle = "#ebdfcc";
    ctx.font = "bold 9.5px 'Inter', sans-serif";
    ctx.textAlign = "center";
    const label = ap.ssid.length > 14 ? ap.ssid.substring(0, 13) + "…" : ap.ssid;
    ctx.fillText(`${label} (${ap.rssi} dBm)`, peakX, peakY - 6);
  });
}

// --------------------------------------------------------------------------
// Spectrum 5 GHz Canvas Renderer
// --------------------------------------------------------------------------
function render5GhzSpectrum(canvas, ctx) {
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 30, right: 30, bottom: 45, left: 55 };

  ctx.fillStyle = "#02031a";
  ctx.fillRect(0, 0, width, height);

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const minRssi = -100;
  const maxRssi = -30;

  function rssiToY(rssi) {
    const clamped = Math.max(minRssi, Math.min(maxRssi, rssi));
    const normalized = (clamped - minRssi) / (maxRssi - minRssi);
    return padding.top + plotHeight * (1 - normalized);
  }

  const channels5G = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165];
  const stepX = plotWidth / channels5G.length;

  ctx.strokeStyle = "rgba(235, 223, 204, 0.08)";
  ctx.lineWidth = 1;
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#8f8576";

  for (let r = minRssi; r <= maxRssi; r += 10) {
    const y = rssiToY(r);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${r} dBm`, 8, y + 3);
  }

  channels5G.forEach((ch, idx) => {
    const x = padding.left + (idx + 0.5) * stepX;
    ctx.strokeStyle = "rgba(235, 223, 204, 0.05)";
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();

    ctx.fillStyle = "#c5baa8";
    ctx.font = "9px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(ch, x, height - padding.bottom + 16);
  });

  const aps5 = appState.accessPoints.filter(ap => ap.channel >= 36);
  aps5.forEach((ap, idx) => {
    const chIdx = channels5G.indexOf(ap.channel);
    if (chIdx === -1) return;

    const color = getNetworkColor(idx, ap.bssid);
    const peakX = padding.left + (chIdx + 0.5) * stepX;
    const peakY = rssiToY(ap.rssi);
    const halfWidth = (stepX * (ap.channel_width === 80 ? 3.5 : (ap.channel_width === 40 ? 1.8 : 0.9)));
    const baseY = rssiToY(minRssi);

    ctx.beginPath();
    ctx.moveTo(peakX - halfWidth, baseY);
    ctx.quadraticCurveTo(peakX, peakY, peakX + halfWidth, baseY);

    const gradient = ctx.createLinearGradient(0, peakY, 0, baseY);
    gradient.addColorStop(0, color + "77");
    gradient.addColorStop(1, color + "08");
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.fillStyle = "#ebdfcc";
    ctx.font = "bold 9px Inter, sans-serif";
    ctx.textAlign = "center";
    const label = ap.ssid.length > 12 ? ap.ssid.substring(0, 11) + "…" : ap.ssid;
    ctx.fillText(`${label} (${ap.rssi} dBm)`, peakX, peakY - 6);
  });
}

// --------------------------------------------------------------------------
// Waterfall (Spectrogram) Rolling Heatmap Renderer
// --------------------------------------------------------------------------
function pushWaterfallFrame() {
  const row = new Array(14).fill(-100);
  const aps24 = appState.accessPoints.filter(ap => ap.channel <= 14);

  aps24.forEach(ap => {
    const chIdx = ap.channel - 1;
    if (chIdx >= 0 && chIdx < 14) {
      if (ap.rssi > row[chIdx]) {
        row[chIdx] = ap.rssi;
      }
    }
  });

  appState.waterfallHistory.unshift(row);
  if (appState.waterfallHistory.length > 80) {
    appState.waterfallHistory.pop();
  }
}

function renderWaterfall(canvas, ctx) {
  const width = canvas.width;
  const height = canvas.height;
  ctx.fillStyle = "#02031a";
  ctx.fillRect(0, 0, width, height);

  const history = appState.waterfallHistory;
  if (!history.length) return;

  const rowHeight = height / 80;
  const colWidth = width / 14;

  // Solid palette mapping: #02031a -> #021b2b -> #b10c43 -> #ff0841 -> #ebdfcc
  function getHeatmapColor(dbm) {
    const val = Math.max(0, Math.min(1, (dbm + 95) / 55));
    if (val < 0.25) {
      return "#021b2b";
    } else if (val < 0.6) {
      return "#b10c43";
    } else if (val < 0.85) {
      return "#ff0841";
    } else {
      return "#ebdfcc";
    }
  }

  history.forEach((row, rIdx) => {
    const y = rIdx * rowHeight;
    row.forEach((rssi, cIdx) => {
      const x = cIdx * colWidth;
      ctx.fillStyle = getHeatmapColor(rssi);
      ctx.fillRect(x, y, colWidth + 0.5, rowHeight + 0.5);
    });
  });

  ctx.strokeStyle = "rgba(2, 3, 26, 0.6)";
  ctx.lineWidth = 1;
  for (let c = 1; c <= 14; c++) {
    const x = c * colWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}

// --------------------------------------------------------------------------
// Active Canvas Coordinator
// --------------------------------------------------------------------------
function renderActiveCanvas() {
  const canvas = document.getElementById("spectrumCanvas");
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
  }

  const ctx = canvas.getContext("2d");

  if (appState.currentTab === "2.4ghz") {
    render24GhzSpectrum(canvas, ctx);
  } else if (appState.currentTab === "5ghz") {
    render5GhzSpectrum(canvas, ctx);
  } else if (appState.currentTab === "waterfall") {
    renderWaterfall(canvas, ctx);
  }
}

// --------------------------------------------------------------------------
// Networks Table Renderer
// --------------------------------------------------------------------------
function renderNetworksTable() {
  const tbody = document.getElementById("networksTableBody");
  if (!tbody) return;

  let aps = [...appState.accessPoints];

  if (appState.bandFilter === "2.4ghz") {
    aps = aps.filter(ap => ap.channel <= 14);
  } else if (appState.bandFilter === "5ghz") {
    aps = aps.filter(ap => ap.channel >= 36);
  }

  if (appState.searchQuery) {
    const q = appState.searchQuery.toLowerCase();
    aps = aps.filter(ap => 
      ap.ssid.toLowerCase().includes(q) ||
      ap.bssid.toLowerCase().includes(q) ||
      (ap.vendor && ap.vendor.toLowerCase().includes(q))
    );
  }

  aps.sort((a, b) => b.rssi - a.rssi);
  tbody.innerHTML = "";

  if (aps.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-dim);">No se detectaron redes con los filtros aplicados.</td></tr>`;
    return;
  }

  aps.forEach(ap => {
    const tr = document.createElement("tr");
    
    let barColor = "var(--color4)";
    if (ap.rssi >= -65) barColor = "var(--color4)";
    else if (ap.rssi >= -75) barColor = "var(--color3)";
    else barColor = "#77112d";

    tr.innerHTML = `
      <td><strong>${escapeHtml(ap.ssid)}</strong></td>
      <td><span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted);">${ap.bssid}</span></td>
      <td>${escapeHtml(ap.vendor || "Desconocido")}</td>
      <td><span style="font-weight:700; color:var(--color4); font-family:var(--font-mono);">${ap.channel}</span></td>
      <td><span class="badge ${ap.band === '5GHz' ? 'badge-engine' : 'badge-live'}">${ap.band}</span></td>
      <td>
        <div class="signal-bar-container">
          <span style="font-family:var(--font-mono); font-weight:700; color:var(--color5);">${ap.rssi} dBm</span>
          <div class="signal-meter">
            <div class="signal-meter-fill" style="width:${ap.signal_quality}%; background-color:${barColor};"></div>
          </div>
        </div>
      </td>
      <td><span style="font-size:0.75rem; color:var(--color5);">${escapeHtml(ap.security || "WPA2")}</span></td>
      <td><span style="font-size:0.75rem; font-family:var(--font-mono); color:var(--color5);">${ap.channel_width || 20} MHz</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --------------------------------------------------------------------------
// Report Generation & Export Handlers
// --------------------------------------------------------------------------
async function exportReportPDF() {
  const btn = document.getElementById("btnExportPdf");
  const origText = btn.innerHTML;
  btn.innerHTML = `↻ Generando PDF...`;
  btn.disabled = true;

  try {
    const res = await fetch("/api/reports/pdf", { method: "POST" });
    const data = await res.json();
    if (data.download_url) {
      window.location.href = data.download_url;
    }
  } catch (err) {
    alert("Error generando reporte PDF: " + err.message);
  } finally {
    btn.innerHTML = origText;
    btn.disabled = false;
  }
}

async function exportReportExcel() {
  const btn = document.getElementById("btnExportExcel");
  const origText = btn.innerHTML;
  btn.innerHTML = `↻ Generando Excel...`;
  btn.disabled = true;

  try {
    const res = await fetch("/api/reports/excel", { method: "POST" });
    const data = await res.json();
    if (data.download_url) {
      window.location.href = data.download_url;
    }
  } catch (err) {
    alert("Error generando exportación Excel: " + err.message);
  } finally {
    btn.innerHTML = origText;
    btn.disabled = false;
  }
}

// --------------------------------------------------------------------------
// Session Management Modal
// --------------------------------------------------------------------------
function openNewSessionModal() {
  document.getElementById("sessionModal").classList.add("active");
}

function closeNewSessionModal() {
  document.getElementById("sessionModal").classList.remove("active");
}

async function submitNewSession() {
  const name = document.getElementById("sessionNameInput").value || "Auditoría AeroScan";
  const location = document.getElementById("sessionLocationInput").value || "Sede";
  const engine_type = document.getElementById("sessionEngineSelect").value;
  const user_id = appState.currentUser ? appState.currentUser.id : null;

  try {
    const res = await fetch("/api/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, location, engine_type, user_id })
    });
    const data = await res.json();
    closeNewSessionModal();
    console.log("[AeroScan] Nueva sesión iniciada:", data);
  } catch (err) {
    alert("Error iniciando sesión: " + err.message);
  }
}

// --------------------------------------------------------------------------
// Initialization & Event Listeners
// --------------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  // Tabs navigation
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      appState.currentTab = btn.getAttribute("data-tab");
      renderActiveCanvas();
    });
  });

  // Table filter buttons
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      appState.bandFilter = btn.getAttribute("data-filter");
      renderNetworksTable();
    });
  });

  // Search input
  const searchInput = document.getElementById("tableSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      appState.searchQuery = e.target.value;
      renderNetworksTable();
    });
  }

  // Buttons
  document.getElementById("btnExportPdf")?.addEventListener("click", exportReportPDF);
  document.getElementById("btnExportExcel")?.addEventListener("click", exportReportExcel);
  document.getElementById("btnNewSession")?.addEventListener("click", openNewSessionModal);
  document.getElementById("modalCancelBtn")?.addEventListener("click", closeNewSessionModal);
  document.getElementById("modalSubmitBtn")?.addEventListener("click", submitNewSession);

  // Resize canvas on window resize
  window.addEventListener("resize", renderActiveCanvas);

  // Check authentication status on startup
  checkAuthStatus();
});
