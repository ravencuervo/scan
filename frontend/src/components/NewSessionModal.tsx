import React, { useState } from 'react';
import type { WirelessAdapter } from '../types/spectrum';
import './NewSessionModal.css';

interface NewSessionModalProps {
  isOpen: boolean;
  adapters?: WirelessAdapter[];
  selectedAdapter?: string;
  onClose: () => void;
  onStartSession: (name: string, location: string, engineType: string, adapterId?: string) => Promise<void>;
}

export const NewSessionModal: React.FC<NewSessionModalProps> = ({
  isOpen,
  adapters = [],
  selectedAdapter = 'ALL',
  onClose,
  onStartSession,
}) => {
  const [name, setName] = useState('Auditoría Espectro - UNA Puno');
  const [location, setLocation] = useState('Facultad de Ingeniería de Sistemas / Puno');
  const [engineType, setEngineType] = useState('auto');
  const [adapterId, setAdapterId] = useState(selectedAdapter);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onStartSession(name, location, engineType, adapterId);
      onClose();
    } catch (err: any) {
      alert('Error iniciando auditoría: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color6)' }}>
            Configurar Nueva Auditoría
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '1.2rem',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="session-name">Nombre de la Auditoría / Escenario</label>
              <input
                id="session-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="session-location">Ubicación / Pabellón</label>
              <input
                id="session-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="session-engine">Motor de Captura de Radio</label>
              <select
                id="session-engine"
                value={engineType}
                onChange={(e) => setEngineType(e.target.value)}
              >
                <option value="auto">Detección Automática de Hardware (Recomendado)</option>
                <option value="windows">Motor Windows Nativo (Hardware Físico)</option>
                <option value="scapy_wsl">Linux / WSL2 Scapy (Modo Monitor)</option>
              </select>
            </div>

            {adapters.length > 0 && (
              <div className="form-group">
                <label htmlFor="session-adapter">Módulo de Hardware Wi-Fi Asignado</label>
                <select
                  id="session-adapter"
                  value={adapterId}
                  onChange={(e) => setAdapterId(e.target.value)}
                >
                  {adapters.length > 1 && (
                    <option value="ALL">
                      ⚡ TODOS LOS MÓDULOS ({adapters.length} Transceptores en Paralelo)
                    </option>
                  )}
                  {adapters.map((ad) => (
                    <option key={ad.id} value={ad.id}>
                      📶 {ad.name} — {ad.description} [{ad.mac_address || 'Sin MAC'}]{' '}
                      {ad.connected_ssid ? `(Conectado a ${ad.connected_ssid})` : '(Libre)'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Iniciando...' : 'Iniciar Captura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
