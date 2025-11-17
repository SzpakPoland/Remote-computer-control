const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// Serwowanie plików do pobrania
app.use('/downloads', express.static(path.join(__dirname, '..', 'remote-agent', 'dist')));

// Przechowywanie połączonych komputerów i klientów webowych
const computers = new Map(); // id -> {ws, name, info}
const webClients = new Set();

wss.on('connection', (ws) => {
  console.log('Nowe połączenie WebSocket');
  
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
          
          console.log(`Komputer zarejestrowany: ${data.name} (${computerId})`);
          
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
          // Klient webowy rejestruje się
          ws.isWebClient = true;
          webClients.add(ws);
          
          // Wyślij listę dostępnych komputerów
          ws.send(JSON.stringify({
            type: 'computer_list',
            computers: getComputersList()
          }));
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
      console.log(`Komputer rozłączony: ${ws.computerId}`);
      computers.delete(ws.computerId);
      
      // Powiadom klientów webowych
      broadcastToWebClients({
        type: 'computer_list_update',
        computers: getComputersList()
      });
    } else if (ws.isWebClient) {
      webClients.delete(ws);
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
  webClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// REST API endpoints
app.get('/api/computers', (req, res) => {
  res.json(getComputersList());
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', computers: computers.size, clients: webClients.size });
});

// Endpoint do pobrania agenta
app.get('/api/download-agent', (req, res) => {
  const agentPath = path.join(__dirname, '..', 'remote-agent', 'dist', 'RemoteControlAgent.exe');
  
  if (fs.existsSync(agentPath)) {
    res.download(agentPath, 'RemoteControlAgent.exe');
  } else {
    res.status(404).json({ 
      error: 'Agent nie został jeszcze zbudowany. Uruchom: cd remote-agent && npm run build' 
    });
  }
});

// Endpoint do generowania agenta z konfiguracją
app.post('/api/generate-agent', (req, res) => {
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

// Endpoint do pobrania konfiguracji
app.get('/api/download-config', (req, res) => {
  const configPath = path.join(__dirname, '..', 'remote-agent', 'dist', 'config.json');
  
  if (fs.existsSync(configPath)) {
    res.download(configPath, 'config.json');
  } else {
    res.status(404).json({ error: 'Plik konfiguracyjny nie istnieje' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
  console.log(`HTTP API: http://localhost:${PORT}/api`);
  console.log(`Download Agent: http://localhost:${PORT}/api/download-agent`);
});
