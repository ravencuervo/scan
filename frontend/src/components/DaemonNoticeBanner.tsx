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
            ? `Motor de captura sincronizado en tiempo real (${engineType.toUpperCase()}). Transmitiendo métricas del daemon en puerto 8765.`
            : 'Modo demostrativo sincronizado. Motor de captura no conectado: Las métricas reales se sincronizarán al iniciar el servicio local daemon en puerto 8765'}
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
