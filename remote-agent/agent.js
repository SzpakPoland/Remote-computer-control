const WebSocket = require('ws');
const os = require('os');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Konfiguracja
const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = {
  serverUrl: 'ws://localhost:3001',
  computerName: os.hostname(),
  reconnectInterval: 5000
};

// Wczytaj konfigurację jeśli istnieje
if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
  } catch (error) {
    console.error('Błąd wczytywania konfiguracji:', error);
  }
} else {
  // Utwórz domyślną konfigurację
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log('Utworzono plik konfiguracyjny:', CONFIG_FILE);
}

let ws = null;
let reconnectTimeout = null;
let computerId = null;

// Funkcje wykonywania komend specyficzne dla systemu
function setVolume(volume) {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      // Windows - używa NirCmd (prostsze rozwiązanie)
      // Alternatywnie można użyć PowerShell
      const volumeLevel = Math.round((volume / 100) * 65535);
      
      // Metoda 1: PowerShell z prostym skryptem
      command = `powershell -Command "$wshell = new-object -com wscript.shell; 1..50 | ForEach-Object { $wshell.SendKeys([char]174) }; 1..${volume * 2} | ForEach-Object { $wshell.SendKeys([char]175) }"`;
      
      // Metoda 2: Bardziej niezawodna - zapisz i wykonaj skrypt PS1
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, 'set-volume.ps1');
      const psScript = `
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume
{
    int NotImpl1();
    int NotImpl2();
    int RegisterControlChangeNotify();
    int UnregisterControlChangeNotify();
    int GetChannelCount();
    int SetMasterVolumeLevel(float level, System.Guid eventContext);
    int SetMasterVolumeLevelScalar(float level, System.Guid eventContext);
    int GetMasterVolumeLevel();
    int GetMasterVolumeLevelScalar(out float level);
    int SetChannelVolumeLevel();
    int SetChannelVolumeLevelScalar();
    int GetChannelVolumeLevel();
    int GetChannelVolumeLevelScalar();
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool isMuted, System.Guid eventContext);
    int GetMute(out bool isMuted);
    int GetVolumeStepInfo();
    int VolumeStepUp();
    int VolumeStepDown();
    int QueryHardwareSupport();
    int GetVolumeRange();
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice
{
    int Activate(ref System.Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev);
}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator
{
    int NotImpl1();
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorComObject { }
public class Audio
{
    static IAudioEndpointVolume Vol()
    {
        var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
        IMMDevice dev = null;
        enumerator.GetDefaultAudioEndpoint(0, 0, out dev);
        IAudioEndpointVolume epv = null;
        var epvid = typeof(IAudioEndpointVolume).GUID;
        dev.Activate(ref epvid, 0, 0, out epv);
        return epv;
    }
    public static float GetVolume()
    {
        float v = -1;
        Vol().GetMasterVolumeLevelScalar(out v);
        return v;
    }
    public static void SetVolume(float v)
    {
        Vol().SetMasterVolumeLevelScalar(v, System.Guid.Empty);
    }
    public static void SetMute(bool mute)
    {
        Vol().SetMute(mute, System.Guid.Empty);
    }
}
"@
[Audio]::SetVolume(${volume / 100})
      `;
      
      fs.writeFileSync(scriptPath, psScript, 'utf8');
      command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;
      
    } else if (platform === 'darwin') {
      // macOS
      command = `osascript -e "set volume output volume ${volume}"`;
    } else if (platform === 'linux') {
      // Linux - używa amixer
      command = `amixer -D pulse sset Master ${volume}%`;
    } else {
      reject(new Error('Nieobsługiwany system operacyjny'));
      return;
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Błąd ustawiania głośności:', error.message);
        console.error('stderr:', stderr);
        reject(new Error(`Nie udało się ustawić głośności: ${error.message}`));
      } else {
        console.log(`Głośność ustawiona na ${volume}%`);
        resolve(`Głośność ustawiona na ${volume}%`);
      }
    });
  });
}

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
      command = 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0';
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
        resolve('Komputer zostanie uśpiony');
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

async function executeCommand(command, params) {
  console.log(`Wykonywanie komendy: ${command}`, params);
  
  try {
    let result;
    
    switch (command) {
      case 'set_volume':
        result = await setVolume(params.volume || 50);
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
        
      case 'get_info':
        result = await getSystemInfo();
        result = JSON.stringify(result, null, 2);
        break;
        
      default:
        throw new Error(`Nieznana komenda: ${command}`);
    }
    
    return { success: true, message: result };
  } catch (error) {
    console.error('Błąd wykonywania komendy:', error);
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

  ws.on('open', () => {
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

  ws.on('close', () => {
    console.log('Rozłączono z serwerem');
    reconnect();
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
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

// Start
console.log('=== Remote Control Agent ===');
console.log(`Nazwa komputera: ${config.computerName}`);
console.log(`System: ${os.platform()} ${os.arch()}`);
console.log(`Serwer: ${config.serverUrl}`);
console.log('===========================\n');

connect();
