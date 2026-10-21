import React from 'react';
import './DocsView.css';

export const DocsView: React.FC = () => {
  return (
    <div className="docs-view-container">
      {/* 1. Header */}
      <div className="docs-header-card">
        <div className="docs-header-title">
          <i className="bi bi-book-half"></i>
          <div>
            <h2>Manual Técnico y Guía de Ingeniería de Espectro RF</h2>
            <p>
              Estándares IEEE 802.11, mitigación de interferencias y uso del analizador AeroScan
            </p>
          </div>
        </div>
      </div>

      {/* 2. Grid of documentation cards */}
      <div className="docs-cards-grid">
        {/* Card 1: Fundamentos de Coexistencia RF */}
        <div className="docs-card">
          <div className="docs-card-header">
            <i className="bi bi-broadcast"></i>
            <span className="docs-card-title">1. Coexistencia y Planificación de Canales</span>
          </div>
          <div className="docs-card-body">
            <p>
              En la banda de <strong>2.4 GHz</strong> (802.11b/g/n/ax), cada canal tiene un ancho de 20 MHz o 22 MHz, pero los centros de canal están espaciados únicamente por 5 MHz. Como consecuencia, únicamente existen <strong>tres canales no solapados</strong>:
            </p>
            <div style={{ marginBottom: '8px' }}>
              <span className="docs-pill-tag">Canal 1 (2412 MHz)</span>
              <span className="docs-pill-tag">Canal 6 (2437 MHz)</span>
              <span className="docs-pill-tag">Canal 11 (2462 MHz)</span>
            </div>
            <p>
              Utilizar canales intermedios (como 2, 3, 4, 7, 8, 9 o 10) genera <strong>Interferencia de Canal Adyacente (ACI)</strong>, degradando el rendimiento general al no poder decodificar preámbulos CSMA/CA.
            </p>
          </div>
        </div>

        {/* Card 2: Banda 5 GHz y DFS */}
        <div className="docs-card">
          <div className="docs-card-header">
            <i className="bi bi-wifi"></i>
            <span className="docs-card-title">2. Banda de 5 GHz (UNII-1, UNII-2, UNII-3)</span>
          </div>
          <div className="docs-card-body">
            <p>
              La banda de 5 GHz ofrece más de 25 canales no solapados de 20 MHz con soporte para agregación de 40 MHz, 80 MHz y 160 MHz:
            </p>
            <p>
              • <strong>UNII-1 (Interiores):</strong> Canales 36, 40, 44, 48.<br />
              • <strong>UNII-2 / UNII-2 Extended (DFS):</strong> Canales 52 a 144 (requieren detección dinámica de radar meteorológico/militar).<br />
              • <strong>UNII-3 (Alta potencia):</strong> Canales 149, 153, 157, 161, 165.
            </p>
            <div className="docs-code-box">
              Throughput Teórico: 20MHz ~144Mbps | 40MHz ~300Mbps | 80MHz ~866Mbps (802.11ac)
            </div>
          </div>
        </div>

        {/* Card 3: Interpretación de Métricas de Potencia */}
        <div className="docs-card">
          <div className="docs-card-header">
            <i className="bi bi-reception-4"></i>
            <span className="docs-card-title">3. Niveles de Potencia RSSI y Ruido (dBm)</span>
          </div>
          <div className="docs-card-body">
            <p>
              El Indicador de Fuerza de Señal Recibida (RSSI) se mide en escala logarítmica de decibelios-milivatio (dBm):
            </p>
            <p>
              • <strong>-30 a -50 dBm:</strong> Máxima señal (cercanía inmediata a la antena).<br />
              • <strong>-55 a -67 dBm:</strong> Rango óptimo para VoIP, videollamadas y streaming HD.<br />
              • <strong>-70 a -75 dBm:</strong> Nivel mínimo aceptable para navegación web estándar.<br />
              • <strong>&lt; -80 dBm:</strong> Señal crítica, alta tasa de retransmisión de tramas.<br />
              • <strong>-95 dBm:</strong> Piso de ruido térmico típico del receptor físico.
            </p>
          </div>
        </div>

        {/* Card 4: Arquitectura del Motor AeroScan */}
        <div className="docs-card">
          <div className="docs-card-header">
            <i className="bi bi-cpu-fill"></i>
            <span className="docs-card-title">4. Arquitectura de Hardware y API Windows Native</span>
          </div>
          <div className="docs-card-body">
            <p>
              AeroScan se comunica directamente con el subsistema <strong>Native Wi-Fi (WLAN API)</strong> de Windows a través del controlador NDIS de cada interfaz de red conectada:
            </p>
            <div className="docs-code-box">
              Windows Native Engine &gt;&gt; Enumeración NDIS &gt;&gt; Parsing BSSID &gt;&gt; WebSocket Stream (10-60 FPS)
            </div>
            <p>
              Permite agregación simultánea de múltiples adaptadores (Multi-Sensor), fusionando paquetes de escaneo de antenas USB externas con antenas internas PCIe en tiempo real.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocsView;
