import React from 'react';
import './DaemonNoticeBanner.css';

interface DaemonNoticeBannerProps {
  isLive: boolean;
  engineType: string;
}

export const DaemonNoticeBanner: React.FC<DaemonNoticeBannerProps> = ({ isLive, engineType }) => {
  return (
    <div className="daemon-notice-strip">
      <div className="daemon-notice-left">
        <i className="bi bi-info-circle-fill"></i>
        <span>
          {isLive
            ? `Captura de hardware en tiempo real activa (${engineType.toUpperCase()}). Transmitiendo telemetría continua por WebSockets.`
            : 'Inicializando enlace con los adaptadores físicos de radio. Sincronizando con el servicio en puerto 8765...'}
        </span>
      </div>

      <div className="daemon-notice-right">
        <span className="daemon-badge">
          DAEMON: {isLive ? 'ACTIVO' : 'STANDBY'}
        </span>
        <button className="daemon-action-btn">
          {isLive ? 'EN SERVICIO' : 'INICIAR SERVICIO'}
        </button>
      </div>
    </div>
  );
};
