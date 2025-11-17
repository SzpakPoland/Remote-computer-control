@echo off
echo ========================================
echo   NirCmd Downloader for Remote Control
echo ========================================
echo.
echo Ten skrypt pobierze NirCmd (narzedzie do kontroli glosnosci)
echo.

set DOWNLOAD_URL=https://www.nirsoft.net/utils/nircmd.zip
set TEMP_ZIP=%TEMP%\nircmd.zip
set EXTRACT_DIR=%TEMP%\nircmd_temp

echo [1/4] Pobieranie NirCmd...
powershell -Command "Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%TEMP_ZIP%'"

if not exist "%TEMP_ZIP%" (
    echo BLAD: Nie udalo sie pobrac pliku
    pause
    exit /b 1
)

echo [2/4] Rozpakowywanie...
powershell -Command "Expand-Archive -Path '%TEMP_ZIP%' -DestinationPath '%EXTRACT_DIR%' -Force"

echo [3/4] Wybierz lokalizacje instalacji:
echo.
echo 1. C:\Windows\System32 (ZALECANE - wymaga uprawnien administratora)
echo 2. %~dp0 (Folder z tym skryptem - bez uprawnien administratora)
echo 3. Anuluj
echo.
set /p CHOICE="Wybierz opcje (1-3): "

if "%CHOICE%"=="1" (
    echo [4/4] Kopiowanie do System32...
    copy "%EXTRACT_DIR%\nircmd.exe" "C:\Windows\System32\nircmd.exe"
    if errorlevel 1 (
        echo.
        echo BLAD: Brak uprawnien administratora!
        echo Uruchom ten skrypt jako administrator lub wybierz opcje 2.
        pause
        exit /b 1
    )
    echo.
    echo SUKCES! NirCmd zainstalowany w: C:\Windows\System32\nircmd.exe
) else if "%CHOICE%"=="2" (
    echo [4/4] Kopiowanie do lokalnego folderu...
    copy "%EXTRACT_DIR%\nircmd.exe" "%~dp0nircmd.exe"
    echo.
    echo SUKCES! NirCmd zainstalowany w: %~dp0nircmd.exe
    echo Upewnij sie, ze RemoteControlAgent.exe jest w tym samym folderze!
) else (
    echo Anulowano.
    goto cleanup
)

echo.
echo Sprawdzam instalacje...
where nircmd
if errorlevel 1 (
    echo UWAGA: nircmd nie jest widoczny w PATH
    echo Moze byc konieczny restart komputera lub terminala
) else (
    echo Test: 
    nircmd setsysvolume 32767
    echo Czy uslyszales zmiane glosnosci? (glosnosc powinna byc na 50%%)
)

:cleanup
echo.
echo Czyszczenie plikow tymczasowych...
del "%TEMP_ZIP%" 2>nul
rmdir /s /q "%EXTRACT_DIR%" 2>nul

echo.
echo Gotowe! Mozesz teraz przebudowac i uruchomic agenta.
echo.
pause
