@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ════════════════════════════════════════════════════════════════
REM  DEPLOY MANAGER - Automazione build e versionamento Espòòò
REM ════════════════════════════════════════════════════════════════
REM Versione: MAJOR.MINOR
REM   MAJOR = cambio grande (incompatibile con versioni vecchie)
REM   MINOR = nuove feature o miglioramenti (compatibile indietro)
REM Esempio: 2.0 (major=2, minor=0) → 2.1 → 3.0
REM ════════════════════════════════════════════════════════════════

:menu
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║      Espòòò Clicker - Deploy Manager v1.0                  ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 📦 OPZIONI BUILD
echo   1. Build bundle (compila JS/CSS in dist/)
echo.
echo 🔢 OPZIONI VERSIONAMENTO (aggiorna OVUNQUE - package.json, sw.js, ecc)
echo   2. Bump MAJOR version   (es: 2.0 → 3.0) = cambio grande
echo   3. Bump MINOR version   (es: 2.0 → 2.1) = nuova feature/fix
echo.
echo 🚀 OPZIONI DEPLOY
echo   4. Build + Auto-Commit + Push (compila e carica develop-3)
echo   5. Merge a test (spinge develop-3 → test, avvia test.yml)
echo.
echo ⚙️  ALTRE
echo   6. Esci
echo.
set /p choice="Scegli opzione (1-6): "

if "%choice%"=="1" goto build
if "%choice%"=="2" goto major
if "%choice%"=="3" goto minor
if "%choice%"=="4" goto build_commit_push
if "%choice%"=="5" goto push_test
if "%choice%"=="6" exit /b 0
goto menu

:build
cls
echo.
echo ════════════════════════════════════════════════════════════════
echo  STEP 1: BUILD BUNDLE
echo ════════════════════════════════════════════════════════════════
echo.
echo Compilando JS e CSS da dist/...
echo  - dist/game.bundle.min.js (JavaScript minificato)
echo  - dist/styles.bundle.min.css (CSS minificato)
echo.
call npm run build
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Build completato!
) else (
    echo.
    echo ✗ Errore nel build. Controlla i file.
)
pause
goto menu

:major
cls
echo.
echo ════════════════════════════════════════════════════════════════
echo  BUMP MAJOR VERSION
echo ════════════════════════════════════════════════════════════════
echo.
echo MAJOR = cambio GRANDE, versione incompatibile con quella vecchia
echo Esempio: 2.0 → 3.0
echo.
echo Questo aggiornerà:
echo   - package.json (major: X, minor: 0)
echo   - js/version-config.js (major: X, minor: 0)
echo   - sw.js (CACHE_VERSION 'espo-vX.0')
echo.
call npm run bump:major
pause
goto menu

:minor
cls
echo.
echo ════════════════════════════════════════════════════════════════
echo  BUMP MINOR VERSION
echo ════════════════════════════════════════════════════════════════
echo.
echo MINOR = nuove feature, fix, miglioramenti (compatibile indietro)
echo Esempio: 2.0 → 2.1
echo.
echo Questo aggiornerà:
echo   - package.json (minor: X)
echo   - js/version-config.js (minor: X)
echo   - sw.js (CACHE_VERSION 'espo-v2.X')
echo.
call npm run bump:minor
pause
goto menu

:build_commit_push
cls
echo.
echo ════════════════════════════════════════════════════════════════
echo  BUILD + AUTO-COMMIT + PUSH
echo ════════════════════════════════════════════════════════════════
echo.
echo STEP 1: Compilare il bundle
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Build fallito. Aborting...
    pause
    goto menu
)
echo ✓ Build OK
echo.
echo STEP 2: Aggiungere file compilati (dist/)
call git add dist/
echo ✓ File preparati
echo.
echo STEP 3: Commit e push su develop-3
set /p msg="Scrivi messaggio commit (default='Build v2.0'): "
if "!msg!"=="" set msg="Build v2.0"
call git commit -m "!msg!"
call git push origin develop-3
echo.
echo ✓ Build, commit e push su develop-3 completati!
echo   Prossimo step: opzione 6 per spingere a test
pause
goto menu

:push_test
cls
echo.
echo ════════════════════════════════════════════════════════════════
echo  MERGE A TEST (publish su server test)
echo ════════════════════════════════════════════════════════════════
echo.
echo Sto spingendo develop-3 → test...
echo Questo attiverà il workflow test.yml che:
echo   1. Carica TUTTI i file su server test via FTP
echo   2. Pubblica la nuova versione
echo   3. config.php sarà impostato su 'dev'
echo.
call git push origin develop-3:test
echo.
echo ✓ Push a test completato!
echo   Guarda: https://github.com/tuorepo/actions per status workflow
pause
goto menu
