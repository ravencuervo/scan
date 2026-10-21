import React, { useState, useEffect, useRef } from 'react';
import type { User, ScannedAP, SpectrumMetrics, SpectrumRecommendations, TelemetryPayload } from './types/spectrum';
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
  const [captureMode, setCaptureMode] = useState<'demo' | 'real'>('demo');
  const [isCapturing, setIsCapturing] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [engineType, setEngineType] = useState('windows');
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

  const handleStartSession = async (name: string, location: string, engine: string) => {
    const res = await fetch('/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        location,
        engine_type: engine,
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
            captureMode={captureMode}
            activeTab={activeNav}
            onModeChange={setCaptureMode}
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
                  onToggleCapture={() => setIsCapturing(!isCapturing)}
                  onExportReports={handleExportPdf}
                />

                <div className="main-viz-split-grid">
                  <OscillogramChart accessPoints={accessPoints} />
                  <SdrTelemetryPanel onSaveFrame={handleExportPdf} />
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
              <ReportsView onExportPdf={handleExportPdf} />
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
        onClose={() => setIsModalOpen(false)}
        onStartSession={handleStartSession}
      />
    </>
  );
};

export default App;
