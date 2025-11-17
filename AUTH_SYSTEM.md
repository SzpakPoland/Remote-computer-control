# 🔐 System Autoryzacji - Instrukcja

## 📋 Przegląd

Remote Computer Control posiada wbudowany system autoryzacji użytkowników z hashowaniem haseł SHA512 + bcrypt oraz tokenami JWT.

## 👤 Domyślne Konto ROOT

Przy pierwszym uruchomieniu system automatycznie tworzy konto administratora:

- **Login:** `admin`
- **Hasło:** `admin`
- **Rola:** ROOT

**⚠️ KRYTYCZNE:** Po pierwszym logowaniu **NATYCHMIAST** zmień hasło!

## 🎯 Role Użytkowników

### 👑 ROOT (Administrator)
- Pełny dostęp do systemu
- Zarządzanie użytkownikami (dodawanie, usuwanie, edycja)
- Zmiana haseł wszystkich użytkowników
- Kontrola wszystkich podłączonych komputerów
- Pobieranie agentów

### 👤 USER (Użytkownik)
- Kontrola wszystkich podłączonych komputerów
- Pobieranie agentów
- Zmiana własnego hasła
- **Brak** dostępu do zarządzania użytkownikami

## 🚀 Pierwsze Uruchomienie

### 1. Uruchom Serwer

```bash
cd server
npm install
npm start
```

Serwer automatycznie:
- Utworzy plik `users.json` z domyślnym kontem root
- Zahashuje hasło używając SHA512 + bcrypt
- Będzie gotowy do przyjmowania połączeń

### 2. Uruchom Web Client

```bash
cd web-client
npm install
npm start
```

### 3. Zaloguj się

1. Otwórz przeglądarkę: `http://localhost:3000`
2. Wprowadź dane logowania:
   - Login: `admin`
   - Hasło: `admin`
3. Kliknij "🔐 Zaloguj się"

### 4. Zmień Hasło ROOT (WAŻNE!)

1. Po zalogowaniu kliknij przycisk "👥 Użytkownicy" w nagłówku
2. Znajdź użytkownika `admin` w tabeli
3. Kliknij ikonę 🔑 (Zmień hasło)
4. Wpisz nowe, bezpieczne hasło
5. Zapisz zmiany

## 👥 Zarządzanie Użytkownikami

### Dodawanie Użytkownika

1. Zaloguj się jako ROOT
2. Otwórz panel "👥 Użytkownicy"
3. W sekcji "➕ Dodaj Nowego Użytkownika":
   - Wpisz nazwę użytkownika
   - Wpisz hasło
   - Wybierz rolę (USER lub ROOT)
4. Kliknij "Dodaj"

### Zmiana Hasła

**Jako ROOT (zmiana hasła innym):**
1. Otwórz panel użytkowników
2. Znajdź użytkownika w tabeli
3. Kliknij ikonę 🔑
4. Wpisz nowe hasło
5. Potwierdź

**Jako zwykły użytkownik (zmiana własnego hasła):**
- Obecnie tylko przez API (funkcja w przyszłych wersjach)

### Usuwanie Użytkownika

1. Zaloguj się jako ROOT
2. Otwórz panel użytkowników
3. Znajdź użytkownika w tabeli
4. Kliknij ikonę 🗑️
5. Potwierdź usunięcie

**Uwaga:** Nie można usunąć konta ROOT!

## 🔒 Bezpieczeństwo

### Hashowanie Haseł

System używa podwójnego hashowania:

1. **SHA512** - Pierwsza warstwa hashowania hasła
2. **bcrypt (12 rund)** - Druga warstwa z solą

Hasła **NIGDY** nie są przechowywane w formie jawnej.

### Tokeny JWT

- **Ważność:** 24 godziny
- **Przechowywanie:** localStorage przeglądarki
- **Automatyczne wylogowanie** po wygaśnięciu
- **Tajny klucz:** Konfigurowalny przez `JWT_SECRET`

### Zabezpieczenie WebSocket

- WebSocket wymaga tokenu JWT do połączenia
- Brak tokenu = automatyczne rozłączenie
- Token weryfikowany przy każdym połączeniu

## 📁 Struktura Plików

### server/users.json

Plik przechowujący użytkowników:

```json
{
  "admin": {
    "username": "admin",
    "password": "$2b$12$...", // Zahashowane hasło
    "role": "root",
    "createdAt": "2025-11-17T...",
    "lastLogin": "2025-11-17T..."
  }
}
```

**⚠️ WAŻNE:** 
- Regularnie twórz backup tego pliku!
- Nie edytuj ręcznie (hasła muszą być właściwie zahashowane)

### Backup

```bash
# Backup
cp server/users.json server/users_backup_$(date +%Y%m%d).json

# Przywracanie
cp server/users_backup_20251117.json server/users.json
```

## 🌐 API Endpointy

### Autoryzacja

#### POST /api/auth/login
Logowanie użytkownika

**Request:**
```json
{
  "username": "admin",
  "password": "admin"
}
```

**Response (sukces):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "username": "admin",
    "role": "root",
    "lastLogin": "2025-11-17T14:30:00.000Z"
  }
}
```

#### GET /api/auth/verify
Weryfikacja tokenu

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "username": "admin",
    "role": "root"
  }
}
```

#### POST /api/auth/logout
Wylogowanie (client-side, usuwa token)

### Zarządzanie Użytkownikami (wymaga ROOT)

#### GET /api/users
Lista wszystkich użytkowników

**Headers:**
```
Authorization: Bearer TOKEN
```

**Response:**
```json
{
  "users": [
    {
      "username": "admin",
      "role": "root",
      "createdAt": "2025-11-17T...",
      "lastLogin": "2025-11-17T..."
    }
  ]
}
```

#### POST /api/users
Dodaj nowego użytkownika

**Headers:**
```
Authorization: Bearer TOKEN
```

**Request:**
```json
{
  "username": "jankowalski",
  "password": "bezpiecznehaslo123",
  "role": "user"
}
```

#### DELETE /api/users/:username
Usuń użytkownika

**Headers:**
```
Authorization: Bearer TOKEN
```

#### PUT /api/users/:username/password
Zmień hasło użytkownika

**Headers:**
```
Authorization: Bearer TOKEN
```

**Request:**
```json
{
  "password": "nowehaslo123"
}
```

## 🛠️ Konfiguracja

### Zmiana JWT Secret

Dla produkcji ustaw własny tajny klucz:

**Linux/Mac:**
```bash
export JWT_SECRET="twoj-bardzo-bezpieczny-klucz-minimum-32-znaki"
```

**Windows:**
```powershell
$env:JWT_SECRET="twoj-bardzo-bezpieczny-klucz-minimum-32-znaki"
```

**W kodzie (server/index.js):**
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'remote-control-secret-key-change-in-production';
```

### Czas ważności tokenu

Domyślnie 24h. Aby zmienić, edytuj `server/index.js`:

```javascript
const token = jwt.sign(
  { username: user.username, role: user.role },
  JWT_SECRET,
  { expiresIn: '7d' } // Zmień na '7d', '30d', '1h', itp.
);
```

## 🚨 Troubleshooting

### "Nieprawidłowa nazwa użytkownika lub hasło"
- Sprawdź czy używasz prawidłowych danych
- Dla pierwszego logowania: `admin` / `admin`
- Wielkość liter ma znaczenie!

### "Brak tokenu autoryzacyjnego"
- Wyloguj się i zaloguj ponownie
- Wyczyść localStorage przeglądarki
- Sprawdź czy token nie wygasł

### "Wymagane uprawnienia administratora"
- Funkcja dostępna tylko dla ROOT
- Zaloguj się na konto z rolą ROOT

### Token nie działa po restarcie serwera
- Jeśli zmieniłeś JWT_SECRET, wszyscy użytkownicy muszą zalogować się ponownie
- Ustaw JWT_SECRET jako stałą zmienną środowiskową

### Zapomniałem hasła ROOT
**Rozwiązanie:**
```bash
# Usuń plik users.json
rm server/users.json

# Restart serwera - utworzy nowe konto root z domyślnym hasłem
npm start

# Zaloguj się: admin / admin
# ZMIEŃ HASŁO natychmiast!
```

## 📚 Najlepsze Praktyki

1. **Zmień domyślne hasło** natychmiast po instalacji
2. **Używaj silnych haseł** (minimum 12 znaków, mix liter/cyfr/symboli)
3. **Regularnie twórz backup** pliku users.json
4. **Nie udostępniaj** tokenu JWT publicznie
5. **Używaj HTTPS** w produkcji (nie HTTP)
6. **Ogranicz dostęp** - twórz konta USER zamiast dawać wszystkim ROOT
7. **Monitoruj logowania** - sprawdzaj "Ostatnie logowanie" w panelu
8. **Zmienną JWT_SECRET** trzymaj w tajemnicy
9. **Regularnie aktualizuj** hasła
10. **Nie commituj** users.json do repozytorium Git

## 🔐 Checklist Bezpieczeństwa

- [ ] Zmieniono domyślne hasło ROOT
- [ ] Ustawiono własny JWT_SECRET
- [ ] Utworzono backup users.json
- [ ] Skonfigurowano HTTPS/SSL
- [ ] Firewall zezwala tylko na potrzebne porty
- [ ] Utworzono konta USER dla zespołu (nie wszyscy ROOT)
- [ ] Sprawdzono historię logowań
- [ ] Przetestowano wylogowanie i wygaśnięcie tokenu

---

## 📞 Wsparcie

W razie problemów sprawdź:
- Logi serwera: `pm2 logs remote-control-server`
- Konsolę przeglądarki (F12)
- Plik users.json czy istnieje
- Czy JWT_SECRET jest ustawiony

**System gotowy do bezpiecznego użycia! 🚀**
