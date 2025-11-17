import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const WS_URL = 'ws://localhost:3001';
const API_URL = 'http://localhost:3001/api';

function App() {
  const [computers, setComputers] = useState([]);
  const [selectedComputer, setSelectedComputer] = useState(null);
  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(50);
  const [message, setMessage] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadConfig, setDownloadConfig] = useState({
    serverUrl: window.location.hostname === 'localhost' ? 'ws://localhost:3001' : `ws://${window.location.hostname}:3001`,
    computerName: ''
  });
  const wsRef = useRef(null);

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('Połączono z serwerem');
      setConnected(true);
      ws.send(JSON.stringify({ type: 'register_webclient' }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch(data.type) {
        case 'computer_list':
        case 'computer_list_update':
          setComputers(data.computers);
          break;
          
        case 'command_sent':
          showMessage(`Komenda wysłana: ${data.command}`, 'success');
          break;
          
        case 'command_result':
          const computerName = computers.find(c => c.id === data.computerId)?.name || 'Unknown';
          if (data.success) {
            showMessage(`${computerName}: ${data.message}`, 'success');
          } else {
            showMessage(`${computerName}: Błąd - ${data.message}`, 'error');
          }
          break;
          
        case 'error':
          showMessage(data.message, 'error');
          break;
          
        default:
          break;
      }
    };
    
    ws.onclose = () => {
      console.log('Rozłączono z serwerem');
      setConnected(false);
      setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current = ws;
  };

  const showMessage = (msg, type = 'info') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(''), 5000);
  };

  const sendCommand = (command, params = {}) => {
    if (!selectedComputer) {
      showMessage('Wybierz komputer', 'error');
      return;
    }
    
    if (!connected) {
      showMessage('Brak połączenia z serwerem', 'error');
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'command',
      targetId: selectedComputer.id,
      command,
      params
    }));
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
  };

  const handleVolumeSet = () => {
    sendCommand('set_volume', { volume });
  };

  const handleDownloadAgent = async () => {
    try {
      // Generuj konfigurację
      const response = await fetch(`${API_URL}/generate-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(downloadConfig),
      });

      if (response.ok) {
        // Pobierz agenta
        window.open(`${API_URL}/download-agent`, '_blank');
        
        // Pobierz config.json
        setTimeout(() => {
          window.open(`${API_URL}/download-config`, '_blank');
        }, 500);
        
        showMessage('Pobieranie agenta i konfiguracji...', 'success');
        setShowDownloadModal(false);
      } else {
        const error = await response.json();
        showMessage(error.error || 'Błąd pobierania agenta', 'error');
      }
    } catch (error) {
      showMessage('Błąd połączenia z serwerem', 'error');
    }
  };

  return (
    <div className="App">
      <header className="header">
        <h1>🖥️ Zdalne Sterowanie Komputerami</h1>
        <div className="header-right">
          <button 
            className="btn btn-download" 
            onClick={() => setShowDownloadModal(true)}
            title="Pobierz agenta dla nowego komputera"
          >
            📥 Pobierz Agenta
          </button>
          <div className={`status ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '● Połączono' : '○ Rozłączono'}
          </div>
        </div>
      </header>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="container">
        <div className="sidebar">
          <h2>Dostępne Komputery ({computers.length})</h2>
          {computers.length === 0 ? (
            <p className="no-computers">Brak podłączonych komputerów</p>
          ) : (
            <div className="computer-list">
              {computers.map(computer => (
                <div
                  key={computer.id}
                  className={`computer-item ${selectedComputer?.id === computer.id ? 'selected' : ''}`}
                  onClick={() => setSelectedComputer(computer)}
                >
                  <div className="computer-name">{computer.name}</div>
                  <div className="computer-info">
                    {computer.info.platform && `${computer.info.platform} • `}
                    {computer.info.hostname}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="main-panel">
          {selectedComputer ? (
            <>
              <h2>Kontrola: {selectedComputer.name}</h2>
              
              <div className="control-section">
                <h3>🔊 Głośność</h3>
                <div className="volume-control">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="volume-slider"
                  />
                  <span className="volume-value">{volume}%</span>
                  <button onClick={handleVolumeSet} className="btn btn-primary">
                    Ustaw Głośność
                  </button>
                </div>
                <div className="volume-presets">
                  <button onClick={() => { setVolume(0); sendCommand('set_volume', { volume: 0 }); }} className="btn btn-small">Wycisz</button>
                  <button onClick={() => { setVolume(25); sendCommand('set_volume', { volume: 25 }); }} className="btn btn-small">25%</button>
                  <button onClick={() => { setVolume(50); sendCommand('set_volume', { volume: 50 }); }} className="btn btn-small">50%</button>
                  <button onClick={() => { setVolume(75); sendCommand('set_volume', { volume: 75 }); }} className="btn btn-small">75%</button>
                  <button onClick={() => { setVolume(100); sendCommand('set_volume', { volume: 100 }); }} className="btn btn-small">Max</button>
                </div>
              </div>

              <div className="control-section">
                <h3>⚡ Zarządzanie Zasilaniem</h3>
                <div className="power-controls">
                  <button onClick={() => sendCommand('sleep')} className="btn btn-warning">
                    😴 Uśpij
                  </button>
                  <button onClick={() => sendCommand('restart')} className="btn btn-warning">
                    🔄 Restart
                  </button>
                  <button onClick={() => {
                    if (window.confirm('Czy na pewno chcesz wyłączyć komputer?')) {
                      sendCommand('shutdown');
                    }
                  }} className="btn btn-danger">
                    🔴 Wyłącz
                  </button>
                </div>
              </div>

              <div className="control-section">
                <h3>ℹ️ Informacje</h3>
                <div className="info-controls">
                  <button onClick={() => sendCommand('get_info')} className="btn btn-secondary">
                    Odśwież Informacje
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <h2>Wybierz komputer z listy po lewej stronie</h2>
            </div>
          )}
        </div>
      </div>

      {/* Modal pobierania agenta */}
      {showDownloadModal && (
        <div className="modal-overlay" onClick={() => setShowDownloadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>📥 Pobierz Agenta</h2>
            <p>Skonfiguruj i pobierz agenta dla nowego komputera</p>
            
            <div className="form-group">
              <label>Adres Serwera:</label>
              <input
                type="text"
                value={downloadConfig.serverUrl}
                onChange={(e) => setDownloadConfig({...downloadConfig, serverUrl: e.target.value})}
                placeholder="ws://localhost:3001"
              />
              <small>Adres WebSocket serwera (zmień localhost na IP serwera dla sieci lokalnej)</small>
            </div>

            <div className="form-group">
              <label>Nazwa Komputera (opcjonalna):</label>
              <input
                type="text"
                value={downloadConfig.computerName}
                onChange={(e) => setDownloadConfig({...downloadConfig, computerName: e.target.value})}
                placeholder="Zostaw puste dla domyślnej nazwy"
              />
            </div>

            <div className="modal-actions">
              <button onClick={handleDownloadAgent} className="btn btn-primary">
                📥 Pobierz Agent + Config
              </button>
              <button onClick={() => setShowDownloadModal(false)} className="btn btn-secondary">
                Anuluj
              </button>
            </div>

            <div className="instructions">
              <h4>Instrukcja:</h4>
              <ol>
                <li>Pobierz <code>RemoteControlAgent.exe</code> i <code>config.json</code></li>
                <li>Umieść oba pliki w tym samym folderze na docelowym komputerze</li>
                <li>Uruchom <code>RemoteControlAgent.exe</code></li>
                <li>Komputer pojawi się automatycznie na liście</li>
              </ol>
              <p><strong>Uwaga:</strong> Program nie wymaga uprawnień administratora!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
