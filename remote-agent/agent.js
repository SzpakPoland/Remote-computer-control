#!/usr/bin/env node
const WebSocket = require('ws');
const os = require('os');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Ścieżka do konfiguracji (w folderze z exe lub skryptem)
const isPackaged = typeof process.pkg !== 'undefined';
const APP_DIR = isPackaged ? path.dirname(process.execPath) : __dirname;
const CONFIG_FILE = path.join(APP_DIR, 'config.json');

let config = {
  serverUrl: 'ws://localhost:3001',
  computerName: os.hostname(),
  reconnectInterval: 5000
};

// Funkcja do interaktywnej konfiguracji
async function setupConfiguration() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  console.log('\n=== Konfiguracja Remote Control Agent ===\n');
  
  const serverUrl = await question(`Adres serwera [${config.serverUrl}]: `);
  if (serverUrl.trim()) {
    config.serverUrl = serverUrl.trim();
  }
  
  const computerName = await question(`Nazwa komputera [${config.computerName}]: `);
  if (computerName.trim()) {
    config.computerName = computerName.trim();
  }

  rl.close();

  // Zapisz konfigurację
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log('\n✓ Konfiguracja zapisana w:', CONFIG_FILE);
  console.log('Możesz edytować ten plik ręcznie w przyszłości.\n');
}

// Główna inicjalizacja
async function initConfig() {
  // Wczytaj konfigurację jeśli istnieje
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      config = { ...config, ...savedConfig };
      console.log('✓ Wczytano konfigurację z:', CONFIG_FILE);
    } catch (error) {
      console.error('Błąd wczytywania konfiguracji:', error);
    }
  } else {
    // Pierwsza konfiguracja - zapytaj użytkownika
    await setupConfiguration();
  }
}

let ws = null;
let reconnectTimeout = null;
let computerId = null;

// Funkcja wysyłania logów na Discord
async function sendDiscordLog(commandType, status, details = '', error = null) {
  if (!config.discordWebhook || config.discordWebhook.trim() === '') {
    return; // Brak webhooka - pomijamy logowanie
  }

  const https = require('https');
  const http = require('http');

  const embed = {
    title: `🖥️ ${commandType}`,
    color: status === 'success' ? 0x00ff00 : status === 'error' ? 0xff0000 : 0xffaa00,
    fields: [
      {
        name: '💻 Komputer',
        value: config.computerName || os.hostname(),
        inline: true
      },
      {
        name: '⏰ Czas',
        value: new Date().toLocaleString('pl-PL'),
        inline: true
      },
      {
        name: '📊 Status',
        value: status === 'success' ? '✅ Sukces' : status === 'error' ? '❌ Błąd' : '⚠️ Info',
        inline: true
      }
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

  if (error) {
    embed.fields.push({
      name: '⚠️ Błąd',
      value: `\`\`\`${error.toString().substring(0, 1000)}\`\`\``,
      inline: false
    });
  }

  const payload = JSON.stringify({
    embeds: [embed]
  });

  const webhookUrl = new URL(config.discordWebhook);
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

    req.on('error', (error) => {
      console.error('Błąd wysyłania do Discord:', error.message);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

// Funkcje wykonywania komend specyficzne dla systemu
function shutdownComputer() {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      command = 'shutdown /s /t 5 /c "Zdalne wyłączanie komputera"';
    } else if (platform === 'darwin') {
      command = 'sudo shutdown -h +1';
    } else if (platform === 'linux') {
      command = 'shutdown -h +1';
    } else {
      reject(new Error('Nieobsługiwany system operacyjny'));
      return;
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve('Komputer zostanie wyłączony za 5 sekund');
      }
    });
  });
}

function restartComputer() {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      command = 'shutdown /r /t 5 /c "Zdalny restart komputera"';
    } else if (platform === 'darwin') {
      command = 'sudo shutdown -r +1';
    } else if (platform === 'linux') {
      command = 'shutdown -r +1';
    } else {
      reject(new Error('Nieobsługiwany system operacyjny'));
      return;
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve('Komputer zostanie zrestartowany za 5 sekund');
      }
    });
  });
}

function sleepComputer() {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      // Hibernate: 1,1,0 | Sleep: 0,1,0 | Hybrid: 0,1,1
      command = 'powershell -Command "Add-Type -Assembly System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState([System.Windows.Forms.PowerState]::Suspend, $false, $false)"';
    } else if (platform === 'darwin') {
      command = 'pmset sleepnow';
    } else if (platform === 'linux') {
      command = 'systemctl suspend';
    } else {
      reject(new Error('Nieobsługiwany system operacyjny'));
      return;
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve('Komputer został uśpiony');
      }
    });
  });
}

function getSystemInfo() {
  return Promise.resolve({
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    uptime: `${(os.uptime() / 3600).toFixed(2)} godzin`
  });
}

function muteAudio() {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      command = 'powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"';
    } else if (platform === 'darwin') {
      command = 'osascript -e "set volume output muted true"';
    } else if (platform === 'linux') {
      command = 'amixer -D pulse sset Master mute';
    } else {
      reject(new Error('Nieobsługiwany system operacyjny'));
      return;
    }

    exec(command, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve('Dźwięk wyciszony');
      }
    });
  });
}

function unmuteAudio() {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      command = 'powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"';
    } else if (platform === 'darwin') {
      command = 'osascript -e "set volume output muted false"';
    } else if (platform === 'linux') {
      command = 'amixer -D pulse sset Master unmute';
    } else {
      reject(new Error('Nieobsługiwany system operacyjny'));
      return;
    }

    exec(command, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve('Dźwięk włączony');
      }
    });
  });
}

function lockScreen() {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      command = 'rundll32.exe user32.dll,LockWorkStation';
    } else if (platform === 'darwin') {
      command = '/System/Library/CoreServices/Menu\\ Extras/User.menu/Contents/Resources/CGSession -suspend';
    } else if (platform === 'linux') {
      command = 'loginctl lock-session';
    } else {
      reject(new Error('Nieobsługiwany system operacyjny'));
      return;
    }

    exec(command, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve('Ekran zablokowany');
      }
    });
  });
}

function turnOffMonitor() {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      command = 'powershell -Command "(Add-Type \'[DllImport(\\"user32.dll\\")]public static extern int SendMessage(int hWnd,int hMsg,int wParam,int lParam);\' -Name a -Pas)::SendMessage(-1,0x0112,0xF170,2)"';
    } else if (platform === 'darwin') {
      command = 'pmset displaysleepnow';
    } else if (platform === 'linux') {
      command = 'xset dpms force off';
    } else {
      reject(new Error('Nieobsługiwany system operacyjny'));
      return;
    }

    exec(command, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve('Monitor wyłączony');
      }
    });
  });
}

function openApplication(appName) {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      command = `start ${appName}`;
    } else if (platform === 'darwin') {
      command = `open -a "${appName}"`;
    } else if (platform === 'linux') {
      command = `${appName} &`;
    } else {
      reject(new Error('Nieobsługiwany system operacyjny'));
      return;
    }

    exec(command, (error) => {
      if (error) {
        reject(new Error(`Nie można otworzyć aplikacji: ${error.message}`));
      } else {
        resolve(`Otwarto aplikację: ${appName}`);
      }
    });
  });
}

function showNotification(message) {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      // Windows - użyj msg.exe (powinno działać na wszystkich sesjach)
      // Usuń problematyczne znaki
      const safeMessage = message.replace(/"/g, "'").replace(/\\/g, "/");
      command = `msg * /TIME:30 "${safeMessage}"`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          // Jeśli msg nie działa (np. Windows Home), użyj PowerShell
          console.log('msg.exe nie działa, używam PowerShell...');
          const psMessage = message.replace(/'/g, "''").replace(/"/g, '""');
          const psCommand = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${psMessage}', 'Zdalna Wiadomosc', 'OK', 'Information') | Out-Null"`;
          
          exec(psCommand, (psError) => {
            if (psError) {
              console.error('Błąd PowerShell:', psError.message);
              reject(new Error(`Nie udało się wyświetlić wiadomości: ${psError.message}`));
            } else {
              resolve('Wiadomość wyświetlona (PowerShell)');
            }
          });
        } else {
          resolve('Wiadomość wyświetlona');
        }
      });
      return; // Ważne - wyjdź z funkcji
      
    } else if (platform === 'darwin') {
      const safeMessage = message.replace(/"/g, '\\"');
      command = `osascript -e 'display notification "${safeMessage}" with title "Zdalna Wiadomość"'`;
    } else if (platform === 'linux') {
      const safeMessage = message.replace(/"/g, '\\"');
      command = `notify-send "Zdalna Wiadomość" "${safeMessage}"`;
    } else {
      reject(new Error('Nieobsługiwany system operacyjny'));
      return;
    }

    exec(command, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve('Wiadomość wyświetlona');
      }
    });
  });
}

function emptyRecycleBin() {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      command = 'powershell -Command "Clear-RecycleBin -Force"';
    } else if (platform === 'darwin') {
      command = 'rm -rf ~/.Trash/*';
    } else if (platform === 'linux') {
      command = 'rm -rf ~/.local/share/Trash/*';
    } else {
      reject(new Error('Nieobsługiwany system operacyjny'));
      return;
    }

    exec(command, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve('Kosz został opróżniony');
      }
    });
  });
}

async function executeCommand(command, params) {
  console.log(`Wykonywanie komendy: ${command}`, params);
  
  const commandNames = {
    'mute': '🔇 Wyciszenie dźwięku',
    'unmute': '🔊 Włączenie dźwięku',
    'shutdown': '⚡ Wyłączenie komputera',
    'restart': '🔄 Restart komputera',
    'sleep': '😴 Uśpienie komputera',
    'lock': '🔒 Zablokowanie ekranu',
    'monitor_off': '🖥️ Wyłączenie monitora',
    'open_app': '📱 Uruchomienie aplikacji',
    'show_message': '💬 Wyświetlenie wiadomości',
    'empty_recycle_bin': '🗑️ Opróżnienie kosza',
    'get_info': 'ℹ️ Informacje systemowe'
  };
  
  try {
    let result;
    let details = '';
    
    switch (command) {
      case 'mute':
        result = await muteAudio();
        break;
        
      case 'unmute':
        result = await unmuteAudio();
        break;
        
      case 'shutdown':
        result = await shutdownComputer();
        break;
        
      case 'restart':
        result = await restartComputer();
        break;
        
      case 'sleep':
        result = await sleepComputer();
        break;
        
      case 'lock':
        result = await lockScreen();
        break;
        
      case 'monitor_off':
        result = await turnOffMonitor();
        break;
        
      case 'open_app':
        details = `Aplikacja: ${params.app || 'notepad'}`;
        result = await openApplication(params.app || 'notepad');
        break;
        
      case 'show_message':
        details = `Wiadomość: ${params.message || 'Test'}`;
        result = await showNotification(params.message || 'Test');
        break;
        
      case 'empty_recycle_bin':
        result = await emptyRecycleBin();
        break;
        
      case 'get_info':
        result = await getSystemInfo();
        details = JSON.stringify(result, null, 2);
        result = JSON.stringify(result, null, 2);
        break;
        
      default:
        throw new Error(`Nieznana komenda: ${command}`);
    }
    
    // Wyślij log sukcesu do Discord
    await sendDiscordLog(
      commandNames[command] || command,
      'success',
      details || result
    );
    
    return { success: true, message: result };
  } catch (error) {
    console.error('Błąd wykonywania komendy:', error);
    
    // Wyślij log błędu do Discord
    await sendDiscordLog(
      commandNames[command] || command,
      'error',
      '',
      error
    );
    
    return { success: false, message: error.message };
  }
}

function connect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  console.log(`Łączenie z serwerem: ${config.serverUrl}`);
  ws = new WebSocket(config.serverUrl);

  ws.on('open', async () => {
    console.log('Połączono z serwerem');
    
    // Rejestracja w systemie
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length
    };
    
    ws.send(JSON.stringify({
      type: 'register_computer',
      id: computerId,
      name: config.computerName,
      info: systemInfo
    }));
    
    // Log połączenia do Discord
    await sendDiscordLog(
      '🟢 Połączenie z serwerem',
      'success',
      `System: ${systemInfo.platform} ${systemInfo.arch}\nCPU: ${systemInfo.cpus} rdzeni`
    );
  });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'registered':
          computerId = data.id;
          console.log(`Zarejestrowano z ID: ${computerId}`);
          break;
          
        case 'command':
          const result = await executeCommand(data.command, data.params);
          ws.send(JSON.stringify({
            type: 'command_result',
            command: data.command,
            success: result.success,
            message: result.message
          }));
          break;
      }
    } catch (error) {
      console.error('Błąd przetwarzania wiadomości:', error);
    }
  });

  ws.on('close', async () => {
    console.log('Rozłączono z serwerem');
    
    // Log rozłączenia do Discord
    await sendDiscordLog(
      '🔴 Rozłączenie z serwerem',
      'warning',
      `Próba ponownego połączenia za ${config.reconnectInterval / 1000}s`
    );
    
    reconnect();
  });

  ws.on('error', async (error) => {
    console.error('WebSocket error:', error.message);
    
    // Log błędu do Discord
    await sendDiscordLog(
      '⚠️ Błąd WebSocket',
      'error',
      '',
      error
    );
  });
}

function reconnect() {
  if (!reconnectTimeout) {
    console.log(`Ponowne łączenie za ${config.reconnectInterval / 1000} sekund...`);
    reconnectTimeout = setTimeout(() => {
      connect();
    }, config.reconnectInterval);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nZamykanie agenta...');
  if (ws) {
    ws.close();
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  process.exit(0);
});

// Główna funkcja startowa
async function start() {
  await initConfig();
  
  console.log('\n=== Remote Control Agent ===');
  console.log(`Nazwa komputera: ${config.computerName}`);
  console.log(`System: ${os.platform()} ${os.arch()}`);
  console.log(`Serwer: ${config.serverUrl}`);
  console.log('===========================\n');

  connect();
}

// Start aplikacji
start().catch(error => {
  console.error('Błąd uruchamiania:', error);
  process.exit(1);
});
