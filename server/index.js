const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
  console.log(`HTTP API: http://localhost:${PORT}/api`);
});
