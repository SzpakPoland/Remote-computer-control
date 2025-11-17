# Instrukcja Kompilacji Agenta do .exe

## Krok 1: Zainstaluj zależności

W folderze `remote-agent`:

```bash
cd remote-agent
npm install
```

## Krok 2: Zbuduj plik .exe

```bash
npm run build
```

To utworzy plik `RemoteControlAgent.exe` w folderze `remote-agent/dist/`

## Krok 3: Opcjonalnie - Zbuduj dla wszystkich platform

```bash
npm run build-all
```

To utworzy pliki dla:
- Windows (RemoteControlAgent.exe)
- macOS (RemoteControlAgent-macos)
- Linux (RemoteControlAgent-linux)

## Krok 4: Pobierz agenta ze strony

1. Uruchom serwer i stronę web
2. Kliknij przycisk "📥 Pobierz Agenta" w nagłówku strony
3. Wprowadź adres serwera (np. `ws://192.168.1.100:3001` dla sieci lokalnej)
4. Opcjonalnie ustaw nazwę komputera
5. Kliknij "Pobierz Agent + Config"
6. Zostanie pobranych 2 pliki:
   - `RemoteControlAgent.exe` - agent
   - `config.json` - konfiguracja

## Krok 5: Instalacja na docelowym komputerze

1. Umieść oba pliki (`RemoteControlAgent.exe` i `config.json`) w tym samym folderze
2. Dwukrotnie kliknij `RemoteControlAgent.exe`
3. Agent automatycznie połączy się z serwerem
4. Komputer pojawi się na liście w interfejsie web

## Uwagi

- **Nie wymaga Node.js** - plik .exe jest samodzielny
- **Nie wymaga administratora** - działa bez podwyższonych uprawnień
- **Automatyczna konfiguracja** - jeśli brak config.json, program zapyta o ustawienia
- **Automatyczne łączenie** - agent próbuje łączyć się z serwerem co 5 sekund

## Troubleshooting

### Błąd: "Agent nie został jeszcze zbudowany"
Uruchom najpierw: `cd remote-agent && npm run build`

### Windows Defender blokuje plik
Plik .exe może być oznaczony jako podejrzany. Dodaj wyjątek w Windows Defender lub zbuduj z podpisanym certyfikatem.

### Agent nie łączy się
Sprawdź:
1. Czy serwer działa (`cd server && npm start`)
2. Czy adres w `config.json` jest poprawny
3. Czy firewall nie blokuje portu 3001

### Brak config.json
Jeśli uruchomisz agent bez config.json, program zapyta o:
- Adres serwera
- Nazwę komputera

Możesz też utworzyć plik ręcznie:
```json
{
  "serverUrl": "ws://localhost:3001",
  "computerName": "Mój Komputer",
  "reconnectInterval": 5000
}
```
