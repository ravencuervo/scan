import React, { useState, useEffect, useRef } from 'react';
import type { User, ScannedAP, SpectrumMetrics, SpectrumRecommendations, TelemetryPayload, WirelessAdapter } from './types/spectrum';
import './App.css';
import { LoginOverlay } from './components/LoginOverlay';
import { Sidebar } from './components/Sidebar';
import { HeaderBar } from './components/HeaderBar';
import { DaemonNoticeBanner } from './components/DaemonNoticeBanner';
import { CaptureControlBar } from './components/CaptureControlBar';
import { OscillogramChart } from './components/OscillogramChart';
import { SdrTelemetryPanel } from './components/SdrTelemetryPanel';
import { ChannelSweepStrip } from './components/ChannelSweepStrip';
import { DashboardView } from './components/DashboardView';
import { ChannelAnalysisView } from './components/ChannelAnalysisView';
import { HistoryView } from './components/HistoryView';
import { ReportsView } from './components/ReportsView';
import { KpiCards } from './components/KpiCards';
import { NetworksTable } from './components/NetworksTable';
import { NewSessionModal } from './components/NewSessionModal';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('aeroscan_token'));
  const [activeNav, setActiveNav] = useState('dashboard');
  const [isCapturing, setIsCapturing] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [engineType, setEngineType] = useState('windows');
  const [adapters, setAdapters] = useState<WirelessAdapter[]>([]);
  const [selectedAdapter, setSelectedAdapter] = useState<string>('ALL');
  const [accessPoints, setAccessPoints] = useState<ScannedAP[]>([]);
  const [metrics, setMetrics] = useState<SpectrumMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<SpectrumRecommendations | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  // Validate authentication on startup
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('aeroscan_token');
      if (!storedToken) {
        setUser(null);
        return;
      }

      if (storedToken.startsWith('dev_offline_token_')) {
        localStorage.removeItem('aeroscan_token');
        setUser(null);
        setToken(null);
        return;
      }

      try {
        const res = await fetch(`/api/auth/me?token=${encodeURIComponent(storedToken)}`);
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setToken(storedToken);
        } else {
          localStorage.removeItem('aeroscan_token');
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.warn('Error checking auth:', err);
      }
    };

    checkAuth();

    // Fetch detected Wi-Fi hardware adapters (1, 2, or multi-adapter)
    const fetchAdapters = async () => {
      try {
        const res = await fetch('/api/hardware/adapters');
        if (res.ok) {
          const data = await res.json();
          if (data.adapters) setAdapters(data.adapters);
          if (data.selected_adapter) setSelectedAdapter(data.selected_adapter);
        }
      } catch (err) {
        console.warn('Error fetching hardware adapters:', err);
      }
    };
    fetchAdapters();
  }, []);

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsLive(false);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/spectrum`;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsLive(true);
      };

      ws.onmessage = (event) => {
        try {
          const data: TelemetryPayload = JSON.parse(event.data);
          if (data.type === 'telemetry_update') {
            setAccessPoints(data.access_points || []);
            setMetrics(data.metrics || null);
            setRecommendations(data.recommendations || null);
            if (data.engine_type) setEngineType(data.engine_type);
            if (data.adapters) setAdapters(data.adapters);
            if (data.selected_adapter) setSelectedAdapter(data.selected_adapter);
          }
        } catch (err) {
          console.error('Error parsing telemetry:', err);
        }
      };

      ws.onclose = () => {
        setIsLive(false);
        setTimeout(() => {
          if (user) connect();
        }, 3000);
      };
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [user]);

  const handleLoginSuccess = (authenticatedUser: User, sessionToken: string) => {
    setUser(authenticatedUser);
    setToken(sessionToken);
  };

  const handleLogout = async () => {
    if (token) {
      fetch(`/api/auth/logout?token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => {});
    }
    localStorage.removeItem('aeroscan_token');
    setUser(null);
    setToken(null);
  };

  const handleSelectAdapter = async (adapterId: string) => {
    setSelectedAdapter(adapterId);
    try {
      const res = await fetch('/api/hardware/adapters/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adapter_id: adapterId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.selected_adapter) setSelectedAdapter(data.selected_adapter);
      }
    } catch (err) {
      console.error('Error switching hardware adapter:', err);
    }
  };

  const handleExportPdf = async () => {
    try {
      const res = await fetch('/api/reports/pdf', { method: 'POST' });
      const data = await res.json();
      if (data.download_url) {
        window.location.href = data.download_url;
      }
    } catch (err: any) {
      alert('Error generando PDF: ' + err.message);
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await fetch('/api/reports/excel', { method: 'POST' });
      const data = await res.json();
      if (data.download_url) {
        window.location.href = data.download_url;
      }
    } catch (err: any) {
      alert('Error generando Excel: ' + err.message);
    }
  };

  const handleStartSession = async (name: string, location: string, engine: string, adapterId: string = 'ALL') => {
    const res = await fetch('/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        location,
        engine_type: engine,
        adapter_id: adapterId,
        user_id: user ? user.id : null,
      }),
    });
    if (!res.ok) {
      throw new Error('No se pudo iniciar la sesión');
    }
  };

  return (
    <>
      {!user && <LoginOverlay onLoginSuccess={handleLoginSuccess} />}

      <div className="dashboard-layout">
        {/* Left Fixed Sidebar matching reference layout */}
        <Sidebar
          activeTab={activeNav}
          onTabChange={setActiveNav}
          onLogout={handleLogout}
        />

        {/* Main Dashboard Area */}
        <main className="dashboard-main-area">
          <HeaderBar
            user={user}
            engineType={engineType}
            isLive={isLive}
            activeTab={activeNav}
            onLogout={handleLogout}
          />

          <div className="dashboard-content-body">
            {/* 1. Dashboard Principal (Image 1) */}
            {activeNav === 'dashboard' && (
              <DashboardView
                accessPoints={accessPoints}
                metrics={metrics}
                recommendations={recommendations}
              />
            )}

            {/* 2. Captura en Vivo */}
            {activeNav === 'live' && (
              <>
                <DaemonNoticeBanner isLive={isLive} engineType={engineType} />

                <CaptureControlBar
                  engineType={engineType}
                  isCapturing={isCapturing}
                  totalAps={accessPoints.length}
                  adapters={adapters}
                  selectedAdapter={selectedAdapter}
                  onSelectAdapter={handleSelectAdapter}
                  onToggleCapture={() => setIsCapturing(!isCapturing)}
                  onExportReports={handleExportPdf}
                />

                <div className="main-viz-split-grid">
                  <OscillogramChart accessPoints={accessPoints} />
                  <SdrTelemetryPanel
                    adapters={adapters}
                    selectedAdapter={selectedAdapter}
                    onSaveFrame={handleExportPdf}
                  />
                </div>

                <ChannelSweepStrip accessPoints={accessPoints} />
              </>
            )}

            {/* 3. Análisis de canales (Image 3) */}
            {activeNav === 'channels' && (
              <ChannelAnalysisView accessPoints={accessPoints} />
            )}

            {/* 4. Historial y comparación (Image 2) */}
            {activeNav === 'history' && (
              <HistoryView onGeneratePdf={handleExportPdf} />
            )}

            {/* 5. Reportes técnicos (Image 4) */}
            {activeNav === 'reports' && (
              <ReportsView
                accessPoints={accessPoints}
                metrics={metrics}
                recommendations={recommendations}
                adapters={adapters}
                user={user}
                onExportPdf={handleExportPdf}
                onExportExcel={handleExportExcel}
              />
            )}

            {/* 6. Configuración / Diagnóstico SDR / Documentación */}
            {(activeNav === 'config' || activeNav === 'sdr' || activeNav === 'docs') && (
              <div className="secondary-tab-view">
                <KpiCards metrics={metrics} recommendations={recommendations} />
                <NetworksTable accessPoints={accessPoints} />
              </div>
            )}
          </div>
        </main>
      </div>

      <NewSessionModal
        isOpen={isModalOpen}
        adapters={adapters}
        selectedAdapter={selectedAdapter}
        onClose={() => setIsModalOpen(false)}
        onStartSession={handleStartSession}
      />
    </>
  );
};

export default App;
