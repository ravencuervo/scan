import React, { useState } from 'react';
import './NewSessionModal.css';

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSession: (name: string, location: string, engineType: string) => Promise<void>;
}

export const NewSessionModal: React.FC<NewSessionModalProps> = ({
  isOpen,
  onClose,
  onStartSession,
}) => {
  const [name, setName] = useState('Auditoría Espectro - UNA Puno');
  const [location, setLocation] = useState('Facultad de Ingeniería de Sistemas / Puno');
  const [engineType, setEngineType] = useState('auto');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onStartSession(name, location, engineType);
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
                <option value="auto">Detección Automática (Recomendado)</option>
                <option value="windows">Motor Windows Nativo (Hardware Interno)</option>
                <option value="simulation">Simulador de Espectro RF (Demostración Alta Congestión)</option>
                <option value="scapy_wsl">Linux / WSL2 Scapy (Modo Monitor USB)</option>
              </select>
            </div>
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
