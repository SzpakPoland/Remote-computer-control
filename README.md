# Remote Computer Control 🖥️

System zdalnego sterowania komputerami przez przeglądarkę internetową.

## 📋 Opis

Aplikacja składa się z trzech głównych komponentów:

1. **Server** - Serwer WebSocket do komunikacji między komputerami a interfejsem webowym
2. **Web Client** - Strona internetowa (React) do zarządzania komputerami
3. **Remote Agent** - Program instalowany na zdalnych komputerach

## ✨ Funkcje

- 🔊 Regulacja głośności
- 🔴 Wyłączanie komputera
- 🔄 Restart komputera
- 😴 Usypianie komputera
- ℹ️ Informacje o systemie
- 🔄 Automatyczne ponowne łączenie
- 📊 Lista podłączonych komputerów w czasie rzeczywistym

## 🚀 Instalacja

### Wymagania

- Node.js (wersja 16 lub nowsza)
- npm lub yarn

### 1. Server

```bash
cd server
npm install
npm start
```

Serwer uruchomi się domyślnie na porcie 3001.

### 2. Web Client (Interfejs WWW)

```bash
cd web-client
npm install
npm start
```

Aplikacja webowa uruchomi się na porcie 3000 i otworzy się automatycznie w przeglądarce.

### 3. Remote Agent (Program na zdalnych komputerach)

Na każdym komputerze, który chcesz kontrolować:

```bash
cd remote-agent
npm install
```

Edytuj plik `config.json`:
```json
{
  "serverUrl": "ws://ADRES_IP_SERWERA:3001",
  "computerName": "Nazwa Twojego Komputera",
  "reconnectInterval": 5000
}
```

Uruchom agenta:
```bash
npm start
```

## 📝 Konfiguracja

### Server (config)

W pliku `server/index.js` możesz zmienić port serwera:
```javascript
const PORT = process.env.PORT || 3001;
```

### Web Client (config)

W pliku `web-client/src/App.js` ustaw adres serwera:
```javascript
const WS_URL = 'ws://localhost:3001';
```

Dla produkcji zmień na rzeczywisty adres IP serwera.

### Remote Agent (config)

Plik `remote-agent/config.json`:
- `serverUrl` - adres WebSocket serwera
- `computerName` - nazwa wyświetlana w interfejsie
- `reconnectInterval` - czas w ms między próbami ponownego połączenia

## 🔒 Bezpieczeństwo

⚠️ **WAŻNE**: To jest podstawowa wersja demonstracyjna. Przed użyciem w produkcji:

1. Dodaj autoryzację użytkowników
2. Użyj WSS (WebSocket Secure) zamiast WS
3. Dodaj weryfikację komend
4. Ogranicz dostęp do serwera (firewall, VPN)
5. Dodaj logi wszystkich działań
6. Zabezpiecz endpoint'y API

## 🛠️ Technologie

- **Backend**: Node.js, Express, WebSocket (ws)
- **Frontend**: React, CSS3
- **Agent**: Node.js, WebSocket, system APIs

## 📱 Obsługiwane systemy

Remote Agent działa na:
- ✅ Windows
- ✅ macOS
- ✅ Linux

## 🤝 Rozwój

### Struktura projektu

```
Remote-computer-control/
├── server/              # Serwer WebSocket
│   ├── index.js
│   └── package.json
├── web-client/          # Interfejs React
│   ├── public/
│   ├── src/
│   └── package.json
└── remote-agent/        # Agent dla komputerów
    ├── agent.js
    ├── config.json
    └── package.json
```

### Dodawanie nowych komend

1. W `remote-agent/agent.js` dodaj funkcję komendy
2. Dodaj case w `executeCommand()`
3. W `web-client/src/App.js` dodaj przycisk/UI
4. Wyślij komendę przez `sendCommand()`

## 📄 Licencja

Zobacz plik [LICENSE](LICENSE)

## 🐛 Znane problemy

- Regulacja głośności na Windows wymaga PowerShell
- Na Linux/macOS niektóre komendy mogą wymagać sudo
- Brak szyfrowania komunikacji w wersji podstawowej

## 💡 Pomysły na rozwój

- [ ] Autoryzacja i zarządzanie użytkownikami
- [ ] Szyfrowanie połączeń (WSS)
- [ ] Więcej komend systemowych
- [ ] Historia wykonanych operacji
- [ ] Grupy komputerów
- [ ] Powiadomienia push
- [ ] Aplikacja mobilna
- [ ] Zdalne sterowanie myszką/klawiaturą
- [ ] Transfer plików
- [ ] Monitoring zasobów w czasie rzeczywistym