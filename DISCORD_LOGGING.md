# 📊 Logowanie Discord - Instrukcja

## 🚀 Konfiguracja

System Remote Computer Control może wysyłać wszystkie logi z agenta bezpośrednio na Discord w formie eleganckich embedów.

### Krok 1: Utworzenie Webhooka Discord

1. Otwórz Discord i przejdź do serwera, na którym chcesz otrzymywać logi
2. Kliknij prawym przyciskiem myszy na kanał i wybierz **Edytuj kanał**
3. Przejdź do zakładki **Integracje**
4. Kliknij **Webhook** → **Nowy Webhook**
5. Nazwij webhook (np. "Remote Control Logs")
6. Kliknij **Skopiuj URL Webhooka**

### Krok 2: Konfiguracja Agenta

Otwórz plik `config.json` w folderze z agentem i dodaj URL webhooka:

```json
{
  "serverUrl": "ws://localhost:3001",
  "computerName": "Mój Komputer",
  "reconnectInterval": 5000,
  "discordWebhook": "https://discord.com/api/webhooks/TWOJ_WEBHOOK_ID/TWOJ_TOKEN"
}
```

### Krok 3: Uruchom Agenta

Po zapisaniu konfiguracji, uruchom agenta. Wszystkie akcje będą teraz logowane na Discord!

## 📋 Co Jest Logowane?

System loguje następujące zdarzenia:

### ✅ Komendy (Sukces)
- 🔇 Wyciszenie dźwięku
- 🔊 Włączenie dźwięku
- ⚡ Wyłączenie komputera
- 🔄 Restart komputera
- 😴 Uśpienie komputera
- 🔒 Zablokowanie ekranu
- 🖥️ Wyłączenie monitora
- 📱 Uruchomienie aplikacji
- 💬 Wyświetlenie wiadomości
- 🗑️ Opróżnienie kosza
- ℹ️ Informacje systemowe

### ❌ Błędy
- Każdy błąd wykonania komendy z pełnym opisem

### 🌐 Status Połączenia
- 🟢 Połączenie z serwerem
- 🔴 Rozłączenie z serwerem
- ⚠️ Błędy WebSocket

## 🎨 Format Embedów

Każdy log zawiera:
- **Tytuł**: Nazwa akcji z emoji
- **Kolor**: 
  - 🟢 Zielony - Sukces
  - 🔴 Czerwony - Błąd
  - 🟡 Żółty - Ostrzeżenie/Info
- **Pola**:
  - 💻 Nazwa komputera
  - ⏰ Czas wykonania (format polski)
  - 📊 Status operacji
  - 📝 Szczegóły (opcjonalnie)
  - ⚠️ Informacje o błędzie (jeśli wystąpił)
- **Timestamp**: Dokładna data i godzina

## 🔇 Wyłączanie Logowania

Aby wyłączyć logowanie do Discord, po prostu zostaw pole `discordWebhook` puste lub usuń je:

```json
{
  "serverUrl": "ws://localhost:3001",
  "computerName": "Mój Komputer",
  "reconnectInterval": 5000,
  "discordWebhook": ""
}
```

## 📸 Przykładowe Logi

### Pomyślne wykonanie komendy:
```
🔊 Włączenie dźwięku
💻 Komputer: Mój Komputer
⏰ Czas: 17.11.2025, 14:30:25
📊 Status: ✅ Sukces
```

### Błąd wykonania:
```
⚡ Wyłączenie komputera
💻 Komputer: Laptop-Praca
⏰ Czas: 17.11.2025, 14:32:10
📊 Status: ❌ Błąd
⚠️ Błąd: Error: Insufficient permissions
```

### Połączenie:
```
🟢 Połączenie z serwerem
💻 Komputer: PC-Główny
⏰ Czas: 17.11.2025, 14:00:05
📊 Status: ✅ Sukces
📝 Szczegóły:
System: win32 x64
CPU: 8 rdzeni
```

## 🔐 Bezpieczeństwo

- **NIE** udostępniaj URL webhooka publicznie
- URL webhooka daje pełny dostęp do wysyłania wiadomości na kanał
- Możesz usunąć webhook w każdej chwili w ustawieniach kanału Discord
- Webhook działa tylko dla tego konkretnego kanału

## 🛠️ Troubleshooting

### Logi się nie wysyłają?
1. Sprawdź czy URL webhooka jest poprawny
2. Upewnij się, że webhook nie został usunięty w Discord
3. Sprawdź połączenie internetowe agenta
4. Webhook musi zaczynać się od `https://discord.com/api/webhooks/`

### Zbyt wiele logów?
Możesz:
- Utworzyć osobny kanał tylko dla logów
- Wyciszyć kanał z logami
- Dostosować uprawnienia kanału

## 📚 Więcej Informacji

Dokumentacja Discord Webhooks: https://discord.com/developers/docs/resources/webhook
