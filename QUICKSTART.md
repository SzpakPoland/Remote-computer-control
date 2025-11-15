# Szybki Start - Remote Computer Control

## 1. Uruchom Serwer

Otwórz terminal w folderze projektu:

```bash
cd server
npm install
npm start
```

Powinieneś zobaczyć:
```
Serwer działa na porcie 3001
WebSocket: ws://localhost:3001
HTTP API: http://localhost:3001/api
```

## 2. Uruchom Interfejs Web

Otwórz **nowy terminal**:

```bash
cd web-client
npm install
npm start
```

Aplikacja otworzy się automatycznie w przeglądarce na `http://localhost:3000`

## 3. Uruchom Agenta na Komputerze

Na komputerze, który chcesz kontrolować, otwórz **kolejny terminal**:

```bash
cd remote-agent
npm install
```

**WAŻNE**: Edytuj plik `config.json`:
- Zmień `computerName` na nazwę swojego komputera
- Jeśli serwer jest na innym komputerze, zmień `serverUrl`

```bash
npm start
```

Powinieneś zobaczyć:
```
=== Remote Control Agent ===
Nazwa komputera: Mój Komputer
System: win32 x64
Serwer: ws://localhost:3001
===========================

Łączenie z serwerem: ws://localhost:3001
Połączono z serwerem
Zarejestrowano z ID: ...
```

## 4. Testowanie

1. W przeglądarce (http://localhost:3000) powinieneś zobaczyć swój komputer na liście
2. Kliknij na nazwę komputera
3. Przetestuj funkcje:
   - Zmień głośność suwakiem
   - Użyj przycisków szybkich ustawień głośności
   - Sprawdź informacje o systemie

## Troubleshooting

### Komputer się nie pojawia na liście
- Sprawdź czy serwer działa
- Sprawdź czy agent się połączył (zobacz komunikaty w terminalu)
- Sprawdź czy w `web-client/src/App.js` URL serwera jest poprawny

### Błąd połączenia WebSocket
- Sprawdź czy port 3001 nie jest zajęty
- Upewnij się że firewall nie blokuje połączenia
- Sprawdź adresy URL w konfiguracjach

### Komendy nie działają
- Na Windows niektóre komendy mogą wymagać uprawnień administratora
- Na Linux/macOS komendy shutdown/restart wymagają sudo

## Sieć lokalna

Aby połączyć komputery w sieci lokalnej:

1. Znajdź adres IP komputera z serwerem: `ipconfig` (Windows) lub `ifconfig` (Linux/macOS)
2. W `remote-agent/config.json` zmień `serverUrl` na: `ws://ADRES_IP:3001`
3. W `web-client/src/App.js` zmień `WS_URL` na: `ws://ADRES_IP:3001`
4. Upewnij się że firewall zezwala na port 3001
