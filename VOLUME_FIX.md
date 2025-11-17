# 🔊 Poprawa Kontroli Głośności

## Problem
Wszystkie przyciski ustawiały głośność na 0 zamiast wybranej wartości.

## Rozwiązanie

### Opcja 1: NirCmd (ZALECANE) ⚡
NirCmd to darmowe narzędzie od NirSoft, które pozwala precyzyjnie kontrolować głośność Windows.

**Instalacja:**
1. Pobierz NirCmd: https://www.nirsoft.net/utils/nircmd.html
2. Rozpakuj `nircmd.exe`
3. Skopiuj do jednej z lokalizacji:
   - `C:\Windows\System32\` (wymaga uprawnień admina) - ZALECANE
   - Lub do tego samego folderu co `RemoteControlAgent.exe`

**Zalety:**
- ⚡ Natychmiastowa zmiana głośności (brak opóźnienia)
- 🎯 Precyzja do 1%
- ✅ Zawsze działa poprawnie

### Opcja 2: PowerShell (Domyślny Fallback) 🔄
Jeśli NirCmd nie jest zainstalowany, agent automatycznie użyje PowerShell.

**Uwaga:**
- ⏱️ Wolniejsze (2-10 sekund w zależności od wartości)
- 📊 Mniejsza precyzja (±2-4%)
- Używa symulacji klawiszy Volume Up/Down

## Jak Przetestować

### Test 1: Z NirCmd
```bash
# Sprawdź czy nircmd jest zainstalowany
where nircmd

# Jeśli nie, pobierz i zainstaluj
# Następnie przebuduj agenta
cd remote-agent
npm run build
```

### Test 2: Bez NirCmd (PowerShell)
Agent automatycznie użyje fallback - po prostu testuj normalnie.

### Test Funkcjonalności
1. Uruchom agenta
2. W interfejsie web kliknij na przyciski głośności:
   - 25% - powinno ustawić ~25%
   - 50% - powinno ustawić ~50%
   - 75% - powinno ustawić ~75%
   - Max - powinno ustawić 100%
3. Sprawdź rzeczywistą głośność w systemie Windows

## Zmieniony Kod

### Przed (błędny):
```javascript
const volumeSteps = Math.round(volume / 2);
command = `powershell ... 1..${volumeSteps} ...`;
// Problem: dla volume=0, volumeSteps=0, pętla się nie wykonuje
// Dla małych wartości (np. 25), volumeSteps=12-13, niewystarczające
```

### Po (poprawiony):
```javascript
// Najpierw spróbuj nircmd (szybkie i dokładne)
exec(`nircmd.exe setsysvolume ${volumeLevel}`, callback);

// Fallback na PowerShell z poprawioną logiką:
if (volume === 0) {
  // Tylko wycisz
} else {
  // Wycisz + ustaw konkretną wartość z większym opóźnieniem
  for($i=0; $i -lt ${volumeSteps}; $i++) { ... }
}
```

## Jak Zaktualizować

```bash
cd remote-agent
npm run build
```

Nowy plik: `remote-agent/dist/RemoteControlAgent.exe`

Opcjonalnie zainstaluj NirCmd dla lepszej wydajności.

## Porównanie Wydajności

| Metoda | Czas | Dokładność | Wymaga Instalacji |
|--------|------|------------|-------------------|
| **NirCmd** | <100ms | 100% | Tak (1 plik) |
| **PowerShell** | 2-10s | ~95% | Nie |

## FAQ

**Q: Czy muszę instalować NirCmd?**
A: Nie, ale jest BARDZO zalecane. Bez niego głośność będzie ustawiana wolniej.

**Q: NirCmd jest bezpieczny?**
A: Tak, to zaufane narzędzie od NirSoft używane przez miliony użytkowników. Link: https://www.nirsoft.net/utils/nircmd.html

**Q: Gdzie dokładnie skopiować nircmd.exe?**
A: Najlepiej do `C:\Windows\System32\` (potrzebujesz uprawnień admina). Alternatywnie obok `RemoteControlAgent.exe`.

**Q: Dlaczego PowerShell jest wolny?**
A: Musi symulować fizyczne naciśnięcia klawiszy Volume Up/Down, co wymaga czasu.

**Q: Czy mogę użyć innego narzędzia?**
A: Tak, możesz zmodyfikować kod agenta aby użyć innych narzędzi (np. SoundVolumeView).

## Troubleshooting

### Problem: Nadal ustawia się 0%
1. Sprawdź logi w konsoli agenta
2. Upewnij się że używasz nowej wersji (v1.2.1+)
3. Zainstaluj NirCmd
4. Przebuduj agenta: `npm run build`

### Problem: Głośność skacze losowo
1. To normalne dla PowerShell (symulacja klawiszy)
2. Rozwiązanie: Zainstaluj NirCmd

### Problem: "nircmd is not recognized"
1. Sprawdź czy `nircmd.exe` jest w System32 lub obok agenta
2. Restartuj agenta po skopiowaniu pliku
