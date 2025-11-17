# Remote Computer Control 🖥️

System zdalnego sterowania komputerami przez przeglądarkę internetową z pełną autoryzacją użytkowników.

## 📋 Opis

Aplikacja składa się z trzech głównych komponentów:

1. **Server** - Serwer WebSocket do komunikacji między komputerami a interfejsem webowym
2. **Web Client** - Strona internetowa (React) do zarządzania komputerami
3. **Remote Agent** - Program instalowany na zdalnych komputerach

## 🔐 Bezpieczeństwo

System posiada wbudowaną autoryzację użytkowników:
- **Panel logowania** z JWT tokenami
- **Hashowanie haseł** (SHA512 + bcrypt)
- **Zarządzanie użytkownikami** (tylko ROOT)
- **Role użytkowników** (ROOT / USER)
- **Domyślne konto:** `admin` / `admin` ⚠️ **ZMIEŃ HASŁO PO INSTALACJI!**

📖 **Pełna dokumentacja:** [AUTH_SYSTEM.md](AUTH_SYSTEM.md)

## ✨ Funkcje

### Kontrola Systemu
- 🔊 Wyciszanie/włączanie dźwięku
- 🔴 Wyłączanie komputera
- 🔄 Restart komputera
- 😴 Usypianie komputera
- 🔒 Blokowanie ekranu
- 🖥️ Wyłączanie monitora

### Zarządzanie
- 📱 Uruchamianie aplikacji
- 💬 Wysyłanie wiadomości
- 🗑️ Opróżnianie kosza
- ℹ️ Informacje o systemie
- 📊 Lista komputerów w czasie rzeczywistym

### Autoryzacja i Użytkownicy
- 👤 Panel logowania
- 👥 Zarządzanie użytkownikami (ROOT)
- 🔑 Zmiana haseł
- 🔐 Tokeny JWT (24h)
- 📋 Historia logowań

### Dodatkowe
- 📥 Pobieranie agenta z konfiguracją
- 🔄 Automatyczne ponowne łączenie
- 📊 Logi na Discord (opcjonalnie)

## 🚀 Szybki Start

### Wymagania

- Node.js 18.x lub nowszy
- npm lub yarn

### 1. Server

```bash
cd server
npm install

# Opcjonalnie: Ustaw własny JWT Secret (ZALECANE dla produkcji)
export JWT_SECRET="twoj-bezpieczny-klucz-min-32-znaki"

npm start
```

Serwer uruchomi się na porcie 3001 i automatycznie utworzy domyślne konto ROOT.

### 2. Web Client (Interfejs WWW)

```bash
cd web-client
npm install
npm start
```

Aplikacja webowa uruchomi się na porcie 3000.

### 3. Pierwsze Logowanie ⚠️

1. Otwórz przeglądarkę: `http://localhost:3000`
2. Zaloguj się:
   - **Login:** `admin`
   - **Hasło:** `admin`
3. **NATYCHMIAST** zmień hasło:
   - Kliknij "👥 Użytkownicy"
   - Znajdź użytkownika `admin`
   - Kliknij 🔑 i ustaw nowe hasło

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

✅ System posiada pełną autoryzację użytkowników! Przed użyciem w produkcji:

1. ✅ **Zmień domyślne hasło ROOT** - PIERWSZA rzecz po instalacji!
2. ✅ **Ustaw własny JWT_SECRET** - w zmiennych środowiskowych
3. 🔄 Użyj WSS (WebSocket Secure) zamiast WS
4. 🔄 Skonfiguruj SSL/HTTPS (Nginx + Let's Encrypt)
5. ✅ Ogranicz dostęp do serwera (firewall, VPN)
6. ✅ Logi wszystkich działań (opcjonalnie Discord)
7. ✅ Zabezpieczone endpoint'y API (JWT)

📖 **Szczegóły:** [AUTH_SYSTEM.md](AUTH_SYSTEM.md)

## 🛠️ Technologie

- **Backend**: Node.js, Express, WebSocket (ws), bcrypt, JWT, express-session
- **Frontend**: React 18, CSS3
- **Agent**: Node.js, WebSocket, system APIs
- **Bezpieczeństwo**: SHA512 + bcrypt, JWT tokens, autoryzacja

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

- Na Linux/macOS niektóre komendy mogą wymagać sudo
- WSS (szyfrowane połączenie) wymaga konfiguracji Nginx + SSL

## 💡 Pomysły na rozwój

- [x] Autoryzacja i zarządzanie użytkownikami ✅
- [x] Logi na Discord ✅
- [ ] Szyfrowanie połączeń (WSS)
- [ ] Więcej komend systemowych
- [ ] Historia wykonanych operacji w bazie
- [ ] Grupy komputerów
- [ ] Zdalny pulpit (VNC/RDP)
- [ ] Transfer plików
- [ ] Screenshoty
- [ ] Monitoring zasobów w czasie rzeczywistym

## 📚 Dokumentacja

- 📖 [AUTH_SYSTEM.md](AUTH_SYSTEM.md) - System autoryzacji i zarządzania użytkownikami
- 🌐 [VPS_DEPLOYMENT.md](VPS_DEPLOYMENT.md) - Wdrożenie na serwerze VPS Ubuntu
- 📊 [DISCORD_LOGGING.md](DISCORD_LOGGING.md) - Konfiguracja logów na Discord
- 🐛 [BUGFIXES.md](BUGFIXES.md) - Historia poprawek
- [ ] Aplikacja mobilna
- [ ] Zdalne sterowanie myszką/klawiaturą
- [ ] Transfer plików
- [ ] Monitoring zasobów w czasie rzeczywistym