# 🚀 Wdrożenie na VPS Ubuntu - Instrukcja Krok Po Kroku

## 📋 Wymagania

- Serwer VPS z Ubuntu (18.04, 20.04, 22.04 lub nowszy)
- Dostęp SSH do serwera
- Minimum 512 MB RAM
- Node.js 18.x lub nowszy

## 🔧 Krok 1: Przygotowanie Serwera

### 1.1 Połącz się z VPS przez SSH

```bash
ssh root@TWOJ_ADRES_IP_VPS
# lub
ssh uzytkownik@TWOJ_ADRES_IP_VPS
```

### 1.2 Aktualizacja systemu

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.3 Instalacja Node.js 18.x

```bash
# Dodaj repozytorium NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Zainstaluj Node.js
sudo apt install -y nodejs

# Sprawdź wersję
node --version
npm --version
```

### 1.4 Instalacja Git

```bash
sudo apt install -y git
```

### 1.5 Instalacja PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

## 📁 Krok 2: Przesłanie Projektu na VPS

### Opcja A: Przez Git (Zalecane)

```bash
# Sklonuj repozytorium
cd /home
git clone https://github.com/TWOJ_USERNAME/Remote-computer-control.git
cd Remote-computer-control
```

### Opcja B: Przez SCP (Ręczne przesyłanie)

Na swoim komputerze lokalnym:

```bash
# Spakuj projekt
tar -czf remote-control.tar.gz Remote-computer-control/

# Prześlij na VPS
scp remote-control.tar.gz root@TWOJ_IP:/home/

# Na VPS rozpakuj
cd /home
tar -xzf remote-control.tar.gz
cd Remote-computer-control
```

## ⚙️ Krok 3: Konfiguracja Serwera

### 3.1 Przejdź do katalogu serwera

```bash
cd /home/Remote-computer-control/server
```

### 3.2 Zainstaluj zależności

```bash
npm install
```

### 3.3 Edytuj konfigurację (jeśli potrzeba)

```bash
nano index.js
```

Sprawdź port (domyślnie 3001). Możesz zmienić na inny jeśli chcesz.

## 🚀 Krok 4: Uruchomienie Serwera

### 4.1 Uruchom serwer przez PM2

```bash
pm2 start index.js --name remote-control-server
```

### 4.2 Ustaw autostart po restarcie serwera

```bash
pm2 startup systemd
# Skopiuj i wykonaj komendę która się pojawi

pm2 save
```

### 4.3 Sprawdź status

```bash
pm2 status
pm2 logs remote-control-server
```

## 🔥 Krok 5: Konfiguracja Firewalla

### 5.1 Zainstaluj UFW (jeśli nie ma)

```bash
sudo apt install -y ufw
```

### 5.2 Konfiguruj porty

```bash
# Zezwól na SSH (WAŻNE! Żeby się nie zablokować)
sudo ufw allow 22/tcp

# Zezwól na port serwera
sudo ufw allow 3001/tcp

# Włącz firewall
sudo ufw enable

# Sprawdź status
sudo ufw status
```

## 🌐 Krok 6: Konfiguracja Klienta Web

### Opcja A: Hostowanie na tym samym VPS

```bash
# Przejdź do katalogu web-client
cd /home/Remote-computer-control/web-client

# Zainstaluj zależności
npm install

# Edytuj plik App.js - ustaw właściwy adres WebSocket
nano src/App.js
```

Zmień linię z WebSocket na:

```javascript
const ws = new WebSocket('ws://TWOJ_ADRES_IP_VPS:3001');
```

```bash
# Zbuduj aplikację produkcyjną
npm run build

# Zainstaluj serwer HTTP
sudo npm install -g serve

# Uruchom serwer web przez PM2
pm2 start "serve -s build -l 3000" --name remote-control-web

# Zapisz konfigurację
pm2 save
```

Otwórz port 3000:
```bash
sudo ufw allow 3000/tcp
```

Teraz interfejs web będzie dostępny pod: `http://TWOJ_ADRES_IP_VPS:3000`

### Opcja B: Hostowanie lokalnie (tylko serwer na VPS)

Na swoim komputerze lokalnym, w pliku `web-client/src/App.js` zmień:

```javascript
const ws = new WebSocket('ws://TWOJ_ADRES_IP_VPS:3001');
```

Uruchom lokalnie:
```bash
npm start
```

## 🖥️ Krok 7: Konfiguracja Agenta

### 7.1 Na komputerze który chcesz kontrolować

Pobierz zbudowanego agenta lub zbuduj lokalnie:

```bash
cd remote-agent
npm install
npm run build
```

### 7.2 Edytuj config.json

```json
{
  "serverUrl": "ws://TWOJ_ADRES_IP_VPS:3001",
  "computerName": "Mój Komputer",
  "reconnectInterval": 5000,
  "discordWebhook": ""
}
```

### 7.3 Uruchom agenta

```bash
# Windows
.\dist\RemoteControlAgent.exe

# Linux/Mac (jeśli zbudujesz dla tych systemów)
./dist/RemoteControlAgent
```

## 🔒 Krok 8: Zabezpieczenia (Opcjonalnie - Zalecane)

### 8.1 Konfiguracja Nginx jako Reverse Proxy

```bash
# Zainstaluj Nginx
sudo apt install -y nginx

# Utwórz konfigurację
sudo nano /etc/nginx/sites-available/remote-control
```

Wklej konfigurację:

```nginx
server {
    listen 80;
    server_name TWOJA_DOMENA.COM;

    # Web Client
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket Server
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Aktywuj konfigurację:

```bash
sudo ln -s /etc/nginx/sites-available/remote-control /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8.2 Certyfikat SSL (HTTPS)

```bash
# Zainstaluj Certbot
sudo apt install -y certbot python3-certbot-nginx

# Pobierz certyfikat
sudo certbot --nginx -d TWOJA_DOMENA.COM

# Automatyczne odnawianie
sudo certbot renew --dry-run
```

## 📊 Przydatne Komendy PM2

```bash
# Status wszystkich procesów
pm2 status

# Logi serwera
pm2 logs remote-control-server

# Restart serwera
pm2 restart remote-control-server

# Stop serwera
pm2 stop remote-control-server

# Usunięcie procesu
pm2 delete remote-control-server

# Monitorowanie
pm2 monit
```

## 🛠️ Troubleshooting

### Problem: Nie mogę się połączyć z serwerem

**Rozwiązanie:**
```bash
# Sprawdź czy serwer działa
pm2 status

# Sprawdź logi
pm2 logs

# Sprawdź czy port jest otwarty
sudo netstat -tlnp | grep 3001

# Sprawdź firewall
sudo ufw status
```

### Problem: WebSocket connection failed

**Rozwiązanie:**
1. Sprawdź czy w konfiguracji agenta masz właściwy adres IP VPS
2. Upewnij się, że port 3001 jest otwarty w firewall
3. Sprawdź czy w panelu VPS (np. DigitalOcean, AWS) nie ma dodatkowego firewalla

### Problem: Agent się nie łączy

**Rozwiązanie:**
```bash
# Na VPS sprawdź logi serwera
pm2 logs remote-control-server

# Sprawdź czy agent ma właściwy adres w config.json
# Powinno być: ws://PUBLICZNY_IP_VPS:3001
```

### Problem: Serwer przestaje działać po zamknięciu SSH

**Rozwiązanie:**
```bash
# Upewnij się, że używasz PM2 zamiast node
pm2 start index.js --name remote-control-server

# Zapisz konfigurację
pm2 save

# Ustaw autostart
pm2 startup systemd
```

## 📈 Monitoring i Maintenance

### Sprawdzanie użycia zasobów

```bash
# Monitoring PM2
pm2 monit

# Użycie CPU i RAM
htop

# Miejsce na dysku
df -h

# Logi systemowe
journalctl -u pm2-root -f
```

### Backup konfiguracji

```bash
# Backup całego projektu
cd /home
tar -czf remote-control-backup-$(date +%Y%m%d).tar.gz Remote-computer-control/

# Pobierz na lokalny komputer
# Na lokalnym:
scp root@TWOJ_IP:/home/remote-control-backup-*.tar.gz ./
```

## 🔄 Aktualizacja Projektu

```bash
# Zatrzymaj serwer
pm2 stop remote-control-server

# Pobierz zmiany (jeśli używasz Git)
cd /home/Remote-computer-control
git pull

# Zaktualizuj zależności
cd server
npm install

# Uruchom ponownie
pm2 restart remote-control-server

# Sprawdź logi
pm2 logs
```

## 🌍 Dostęp Zewnętrzny

Po wdrożeniu system będzie dostępny:

- **Serwer WebSocket**: `ws://TWOJ_ADRES_IP_VPS:3001`
- **Panel Web** (jeśli hostowany): `http://TWOJ_ADRES_IP_VPS:3000`
- **Panel Web z Nginx**: `http://TWOJA_DOMENA.COM`
- **Panel Web z SSL**: `https://TWOJA_DOMENA.COM`

## 📱 Kolejne Kroki

1. ✅ Zainstaluj agenta na wszystkich komputerach które chcesz kontrolować
2. ✅ Skonfiguruj Discord webhook dla logowania (opcjonalnie)
3. ✅ Ustaw hasło/autoryzację jeśli planujesz publiczny dostęp
4. ✅ Konfiguruj regularne backupy
5. ✅ Monitoruj logi i wydajność

## 🆘 Pomoc

W razie problemów sprawdź:
- Logi PM2: `pm2 logs`
- Logi systemu: `journalctl -xe`
- Status portów: `sudo netstat -tlnp`
- Status firewall: `sudo ufw status`

---

**Gratulacje! 🎉 Twój system Remote Computer Control działa na VPS!**
