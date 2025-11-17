import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const WS_URL = 'ws://localhost:3001';
const API_URL = 'http://localhost:3001/api';

function App() {
  // Stan autoryzacji
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  
  // Panel zarządzania użytkownikami
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [editingPassword, setEditingPassword] = useState({ username: '', password: '' });
  
  // Istniejący stan
  const [computers, setComputers] = useState([]);
  const [selectedComputer, setSelectedComputer] = useState(null);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadConfig, setDownloadConfig] = useState({
    serverUrl: window.location.hostname === 'localhost' ? 'ws://localhost:3001' : `ws://${window.location.hostname}:3001`,
    computerName: ''
  });
  const wsRef = useRef(null);

  // Sprawdź token przy starcie
  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, []);

  // Połącz WebSocket po zalogowaniu
  useEffect(() => {
    if (isAuthenticated && token) {
      connectWebSocket();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated, token]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('token');
        setToken('');
      }
    } catch (error) {
      console.error('Error verifying token:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginForm)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setToken(data.token);
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('token', data.token);
        showMessage('Zalogowano pomyślnie!', 'success');
      } else {
        showMessage(data.error || 'Błąd logowania', 'error');
      }
    } catch (error) {
      showMessage('Błąd połączenia z serwerem', 'error');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setToken('');
    localStorage.removeItem('token');
    if (wsRef.current) {
      wsRef.current.close();
    }
    showMessage('Wylogowano pomyślnie', 'success');
  };

  const connectWebSocket = () => {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ 
        type: 'register_webclient',
        token: token
      }));
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
          if (data.message.includes('token') || data.message.includes('autoryzacji')) {
            handleLogout();
          }
          break;
          
        default:
          break;
      }
    };
    
    ws.onclose = () => {
      setConnected(false);
      if (isAuthenticated) {
        setTimeout(connectWebSocket, 3000);
      }
    };
    
    ws.onerror = (error) => {
      // WebSocket error
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

  const handleDownloadAgent = async () => {
    try {
      const response = await fetch(`${API_URL}/generate-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(downloadConfig),
      });

      if (response.ok) {
        // Pobierz agenta
        const link = document.createElement('a');
        link.href = `${API_URL}/download-agent`;
        link.setAttribute('download', 'RemoteControlAgent.exe');
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Dodaj token do nagłówka przez fetch
        const agentResponse = await fetch(`${API_URL}/download-agent`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const blob = await agentResponse.blob();
        const url = window.URL.createObjectURL(blob);
        link.href = url;
        link.click();
        document.body.removeChild(link);
        
        // Pobierz config
        setTimeout(async () => {
          const configLink = document.createElement('a');
          const configResponse = await fetch(`${API_URL}/download-config`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const configBlob = await configResponse.blob();
          const configUrl = window.URL.createObjectURL(configBlob);
          configLink.href = configUrl;
          configLink.setAttribute('download', 'config.json');
          configLink.style.display = 'none';
          document.body.appendChild(configLink);
          configLink.click();
          document.body.removeChild(configLink);
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

  // ===== ZARZĄDZANIE UŻYTKOWNIKAMI =====
  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      showMessage('Błąd wczytywania użytkowników', 'error');
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showMessage(`Użytkownik ${newUser.username} dodany!`, 'success');
        setNewUser({ username: '', password: '', role: 'user' });
        loadUsers();
      } else {
        showMessage(data.error || 'Błąd dodawania użytkownika', 'error');
      }
    } catch (error) {
      showMessage('Błąd połączenia', 'error');
    }
  };

  const handleDeleteUser = async (username) => {
    if (!window.confirm(`Czy na pewno usunąć użytkownika ${username}?`)) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/users/${username}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        showMessage(`Użytkownik ${username} usunięty!`, 'success');
        loadUsers();
      } else {
        const data = await response.json();
        showMessage(data.error || 'Błąd usuwania', 'error');
      }
    } catch (error) {
      showMessage('Błąd połączenia', 'error');
    }
  };

  const handleChangePassword = async (username) => {
    const newPassword = prompt(`Nowe hasło dla ${username}:`);
    if (!newPassword) return;
    
    try {
      const response = await fetch(`${API_URL}/users/${username}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      });
      
      if (response.ok) {
        showMessage(`Hasło zmienione dla ${username}!`, 'success');
      } else {
        const data = await response.json();
        showMessage(data.error || 'Błąd zmiany hasła', 'error');
      }
    } catch (error) {
      showMessage('Błąd połączenia', 'error');
    }
  };

  // Ekran logowania
  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>🖥️ Remote Control</h1>
          <h2>Panel Logowania</h2>
          
          {message && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Nazwa użytkownika:</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                placeholder="Wpisz nazwę użytkownika"
                required
                autoFocus
              />
            </div>
            
            <div className="form-group">
              <label>Hasło:</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                placeholder="Wpisz hasło"
                required
              />
            </div>
            
            <button type="submit" className="btn btn-primary btn-block">
              🔐 Zaloguj się
            </button>
          </form>
          
          <div className="login-footer">
            <p>Domyślne konto root:</p>
            <p><code>Login: admin | Hasło: admin</code></p>
          </div>
        </div>
      </div>
    );
  }

  // Główny interfejs
  return (
    <div className="App">
      <header className="header">
        <h1>🖥️ Zdalne Sterowanie Komputerami</h1>
        <div className="header-right">
          {currentUser?.role === 'root' && (
            <button 
              className="btn btn-admin" 
              onClick={() => {
                setShowUserPanel(!showUserPanel);
                if (!showUserPanel) loadUsers();
              }}
              title="Zarządzanie użytkownikami"
            >
              👥 Użytkownicy
            </button>
          )}
          <button 
            className="btn btn-download" 
            onClick={() => setShowDownloadModal(true)}
            title="Pobierz agenta dla nowego komputera"
          >
            📥 Pobierz Agenta
          </button>
          <div className="user-info">
            <span>👤 {currentUser?.username}</span>
            {currentUser?.role === 'root' && <span className="badge-root">ROOT</span>}
          </div>
          <button className="btn btn-logout" onClick={handleLogout}>
            🚪 Wyloguj
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

      {/* Panel zarządzania użytkownikami */}
      {showUserPanel && currentUser?.role === 'root' && (
        <div className="user-management-panel">
          <h2>👥 Zarządzanie Użytkownikami</h2>
          
          <div className="user-management-content">
            <div className="add-user-section">
              <h3>➕ Dodaj Nowego Użytkownika</h3>
              <form onSubmit={handleAddUser}>
                <div className="form-inline">
                  <input
                    type="text"
                    placeholder="Nazwa użytkownika"
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Hasło"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    required
                  />
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  >
                    <option value="user">User</option>
                    <option value="root">Root</option>
                  </select>
                  <button type="submit" className="btn btn-primary">Dodaj</button>
                </div>
              </form>
            </div>
            
            <div className="users-list-section">
              <h3>📋 Lista Użytkowników</h3>
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Użytkownik</th>
                    <th>Rola</th>
                    <th>Utworzono</th>
                    <th>Ostatnie logowanie</th>
                    <th>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.username}>
                      <td>{user.username}</td>
                      <td>
                        <span className={`badge-${user.role}`}>
                          {user.role === 'root' ? '👑 ROOT' : '👤 USER'}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleString('pl-PL')}</td>
                      <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString('pl-PL') : 'Nigdy'}</td>
                      <td>
                        <button 
                          className="btn btn-sm btn-warning"
                          onClick={() => handleChangePassword(user.username)}
                          title="Zmień hasło"
                        >
                          🔑
                        </button>
                        {user.role !== 'root' && (
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteUser(user.username)}
                            title="Usuń użytkownika"
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
                <h3>🔊 Dźwięk</h3>
                <div className="power-controls">
                  <button onClick={() => sendCommand('unmute')} className="btn btn-warning">
                    🔊 Włącz Dźwięk
                  </button>
                  <button onClick={() => sendCommand('mute')} className="btn btn-primary">
                    🔇 Wycisz
                  </button>
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
                <h3>🔒 Bezpieczeństwo i Ekran</h3>
                <div className="power-controls">
                  <button onClick={() => sendCommand('lock')} className="btn btn-secondary">
                    🔒 Zablokuj Ekran
                  </button>
                  <button onClick={() => sendCommand('monitor_off')} className="btn btn-secondary">
                    🖥️ Wyłącz Monitor
                  </button>
                </div>
              </div>

              <div className="control-section">
                <h3>🚀 Aplikacje</h3>
                <div className="power-controls">
                  <button onClick={() => sendCommand('open_app', { app: 'notepad' })} className="btn btn-secondary">
                    📝 Notatnik
                  </button>
                  <button onClick={() => sendCommand('open_app', { app: 'calc' })} className="btn btn-secondary">
                    🔢 Kalkulator
                  </button>
                  <button onClick={() => sendCommand('open_app', { app: 'mspaint' })} className="btn btn-secondary">
                    🎨 Paint
                  </button>
                  <button onClick={() => {
                    const app = prompt('Nazwa aplikacji do uruchomienia:');
                    if (app) sendCommand('open_app', { app });
                  }} className="btn btn-secondary">
                    ➕ Inna Aplikacja
                  </button>
                </div>
              </div>

              <div className="control-section">
                <h3>💬 Komunikacja</h3>
                <div className="power-controls">
                  <button onClick={() => {
                    const message = prompt('Wpisz wiadomość do wyświetlenia na zdalnym komputerze:');
                    if (message) sendCommand('show_message', { message });
                  }} className="btn btn-primary">
                    📨 Wyślij Wiadomość
                  </button>
                </div>
              </div>

              <div className="control-section">
                <h3>🧹 Czyszczenie</h3>
                <div className="power-controls">
                  <button onClick={() => {
                    if (window.confirm('Czy na pewno chcesz opróżnić kosz?')) {
                      sendCommand('empty_recycle_bin');
                    }
                  }} className="btn btn-warning">
                    🗑️ Opróżnij Kosz
                  </button>
                </div>
              </div>

              <div className="control-section">
                <h3>ℹ️ Informacje</h3>
                <div className="info-controls">
                  <button onClick={() => sendCommand('get_info')} className="btn btn-secondary">
                    📊 Odśwież Informacje
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
