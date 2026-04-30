@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ================================================================
REM  DEPLOY MANAGER - Automazione build e versionamento Espooo
REM ================================================================
REM Flusso branch:
REM   develop -> lavoro locale e test rapidi
REM   test    -> pubblicazione test (deploy automatico via test.yml)
REM   main    -> pubblicazione ufficiale (deploy manuale via main.yml)
REM ================================================================

:menu
cls
echo.
echo ================================================================
echo   Espooo Clicker - Deploy Manager v2.0
echo ================================================================
echo.
echo [BUILD]
echo   1. Build bundle (compila JS/CSS in dist/)
echo.
echo [VERSIONAMENTO]
echo   2. Bump MAJOR version   (es: 2.0 -^> 3.0) = cambio grande
echo   3. Bump MINOR version   (es: 2.0 -^> 2.1) = nuova feature/fix
echo.
echo [DEPLOY]
echo   4. Build + Commit + Push  -^> develop
echo   5. Promuovi develop       -^> test    (deploy automatico server test)
echo   6. Promuovi test          -^> main    (release ufficiale con tag)
echo.
echo [CLOUDFLARE R2 (asset privati)]
echo   7. Sync TUTTI gli asset    -^> R2     (sounds + video + songs)
echo   8. Sync solo /assets/sounds -^> R2
echo   9. Sync solo /assets/video  -^> R2
echo  10. Sync solo /music/songs   -^> R2
echo  11. Verifica contenuto bucket R2
echo.
echo [ALTRE]
echo   0. Esci
echo.
set /p choice="Scegli opzione: "

if "%choice%"=="1"  goto build
if "%choice%"=="2"  goto major
if "%choice%"=="3"  goto minor
if "%choice%"=="4"  goto build_commit_push
if "%choice%"=="5"  goto push_test
if "%choice%"=="6"  goto push_main
if "%choice%"=="7"  goto r2_sync_all
if "%choice%"=="8"  goto r2_sync_sounds
if "%choice%"=="9"  goto r2_sync_video
if "%choice%"=="10" goto r2_sync_songs
if "%choice%"=="11" goto r2_list
if "%choice%"=="0"  exit /b 0
goto menu

REM ----------------------------------------------------------------
:build
cls
echo.
echo ================================================================
echo  BUILD BUNDLE
echo ================================================================
echo.
echo Compilando JS e CSS in dist/...
call npm run build
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Build completato!
) else (
    echo.
    echo [ERR] Errore nel build. Controlla i file.
)
pause
goto menu

REM ----------------------------------------------------------------
:major
cls
echo.
echo ================================================================
echo  BUMP MAJOR VERSION
echo ================================================================
echo.
echo MAJOR = cambio GRANDE, incompatibile con versione vecchia
echo Esempio: 2.0 -^> 3.0
echo.
echo Aggiorna: package.json, js/version-config.js, sw.js
echo.
call npm run bump:major
pause
goto menu

REM ----------------------------------------------------------------
:minor
cls
echo.
echo ================================================================
echo  BUMP MINOR VERSION
echo ================================================================
echo.
echo MINOR = nuove feature, fix, miglioramenti
echo Esempio: 2.0 -^> 2.1
echo.
echo Aggiorna: package.json, js/version-config.js, sw.js
echo.
call npm run bump:minor
pause
goto menu

REM ----------------------------------------------------------------
:build_commit_push
cls
echo.
echo ================================================================
echo  BUILD + COMMIT + PUSH -^> develop
echo ================================================================
echo.

echo STEP 1: Build bundle...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERR] Build fallito. Aborting...
    pause
    goto menu
)
echo [OK] Build completato
echo.

echo STEP 2: Stage tutti i file modificati...
call git add -A
echo [OK] File preparati
echo.

echo STEP 3: Commit e push su develop...
set /p msg="Messaggio commit (invio = 'Build aggiornamento'): "
if "!msg!"=="" set msg=Build aggiornamento
call git commit -m "!msg!"
if %ERRORLEVEL% NEQ 0 (
    echo [ERR] Niente da committare o errore commit.
    pause
    goto menu
)
call git push origin develop
echo.
echo [OK] Push su develop completato!
echo      Prossimo step: opzione 5 per promuovere a test.
pause
goto menu

REM ----------------------------------------------------------------
:push_test
cls
echo.
echo ================================================================
echo  PROMUOVI develop -^> test  (deploy server test)
echo ================================================================
echo.
echo Sincronizzera test con develop e avviera test.yml:
echo   - Carica tutti i file su server test via FTP
echo   - config.php sara in modalita 'dev'
echo.
set /p confirm="Confermi? (s/n): "
if /i "!confirm!" NEQ "s" goto menu

echo.
echo Aggiorno develop locale...
call git checkout develop
call git pull origin develop
if %ERRORLEVEL% NEQ 0 (
    echo [ERR] Pull develop fallito.
    pause
    goto menu
)
echo.
echo Forzo test = develop (push diretto)...
call git push --force origin develop:test
if %ERRORLEVEL% NEQ 0 (
    echo [ERR] Push a test fallito.
    pause
    goto menu
)
echo.
echo [OK] test aggiornato. Workflow test.yml avviato su GitHub Actions.
echo      Controlla: https://github.com/SickSartori/espo-clicker/actions
pause
goto menu

REM ----------------------------------------------------------------
:push_main
cls
echo.
echo ================================================================
echo  PROMUOVI test -^> main  (release ufficiale)
echo ================================================================
echo.
echo Mergera test in main e creera un tag di release.
echo Il deploy su produzione va avviato MANUALMENTE da GitHub Actions.
echo.
set /p confirm="Confermi release ufficiale? (s/n): "
if /i "!confirm!" NEQ "s" goto menu

echo.
echo Leggo versione corrente...
for /f "tokens=2 delims=:, " %%v in ('findstr /r "\"version\"" package.json') do (
    set raw=%%v
)
set version=!raw:"=!
echo Versione: !version!
echo.

echo Mergio test -^> main...
call git checkout main
call git merge test --no-ff -m "Release v!version!"
if %ERRORLEVEL% NEQ 0 (
    echo [ERR] Merge fallito. Controlla conflitti.
    pause
    goto menu
)

echo Creo tag v!version!...
call git tag -a "v!version!" -m "Release v!version!"
call git push origin main
call git push origin "v!version!"
call git checkout develop
echo.
echo [OK] Release v!version! pubblicata su main!
echo      Avvia deploy produzione manualmente:
echo      https://github.com/SickSartori/espo-clicker/actions
pause
goto menu

REM ================================================================
REM  CLOUDFLARE R2 — Sync asset privati
REM ================================================================
REM Constants:
REM   R2_REMOTE = nome remote configurato in rclone (default "r2")
REM   R2_BUCKET = nome bucket
REM   PROJECT_DIR = path assoluto progetto
REM ================================================================

:r2_check_rclone
where rclone >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "RCLONE_CMD=rclone"
    exit /b 0
)
REM Se rclone non e nel PATH, prova path comuni
if exist "C:\rclone\rclone.exe" (
    set "RCLONE_CMD=C:\rclone\rclone.exe"
    exit /b 0
)
if exist "%USERPROFILE%\Downloads\rclone-v1.73.5-windows-amd64\rclone-v1.73.5-windows-amd64\rclone.exe" (
    set "RCLONE_CMD=%USERPROFILE%\Downloads\rclone-v1.73.5-windows-amd64\rclone-v1.73.5-windows-amd64\rclone.exe"
    exit /b 0
)
echo [ERR] rclone non trovato.
echo       Installa da https://rclone.org/install/ oppure aggiungi al PATH.
exit /b 1

:r2_sync_all
cls
echo.
echo ================================================================
echo  SYNC TUTTI GLI ASSET -^> R2 (sounds + video + songs)
echo ================================================================
echo.
call :r2_check_rclone
if %ERRORLEVEL% NEQ 0 ( pause & goto menu )

echo Sincronizzo assets/sounds ...
"%RCLONE_CMD%" copy "%~dp0assets\sounds" r2:espo-clicker-assets/assets/sounds -P --transfers 4
if %ERRORLEVEL% NEQ 0 ( echo [ERR] Sync sounds fallito. & pause & goto menu )

echo.
echo Sincronizzo assets/video ...
"%RCLONE_CMD%" copy "%~dp0assets\video" r2:espo-clicker-assets/assets/video -P --transfers 4
if %ERRORLEVEL% NEQ 0 ( echo [ERR] Sync video fallito. & pause & goto menu )

echo.
echo Sincronizzo music/songs ...
"%RCLONE_CMD%" copy "%~dp0music\songs" r2:espo-clicker-assets/music/songs -P --transfers 4
if %ERRORLEVEL% NEQ 0 ( echo [ERR] Sync songs fallito. & pause & goto menu )

echo.
echo [OK] Tutti gli asset sincronizzati su R2.
pause
goto menu

:r2_sync_sounds
cls
echo.
echo ================================================================
echo  SYNC assets/sounds -^> R2
echo ================================================================
echo.
call :r2_check_rclone
if %ERRORLEVEL% NEQ 0 ( pause & goto menu )

"%RCLONE_CMD%" copy "%~dp0assets\sounds" r2:espo-clicker-assets/assets/sounds -P --transfers 4
echo.
if %ERRORLEVEL% EQU 0 ( echo [OK] Sounds sincronizzati. ) else ( echo [ERR] Sync fallito. )
pause
goto menu

:r2_sync_video
cls
echo.
echo ================================================================
echo  SYNC assets/video -^> R2
echo ================================================================
echo.
call :r2_check_rclone
if %ERRORLEVEL% NEQ 0 ( pause & goto menu )

"%RCLONE_CMD%" copy "%~dp0assets\video" r2:espo-clicker-assets/assets/video -P --transfers 4
echo.
if %ERRORLEVEL% EQU 0 ( echo [OK] Video sincronizzati. ) else ( echo [ERR] Sync fallito. )
pause
goto menu

:r2_sync_songs
cls
echo.
echo ================================================================
echo  SYNC music/songs -^> R2
echo ================================================================
echo.
call :r2_check_rclone
if %ERRORLEVEL% NEQ 0 ( pause & goto menu )

"%RCLONE_CMD%" copy "%~dp0music\songs" r2:espo-clicker-assets/music/songs -P --transfers 4
echo.
if %ERRORLEVEL% EQU 0 (
    echo [OK] Songs sincronizzate.
    echo      Ricorda di aggiornare music/songs.json con i nuovi nomi.
) else ( echo [ERR] Sync fallito. )
pause
goto menu

:r2_list
cls
echo.
echo ================================================================
echo  CONTENUTO BUCKET R2 (espo-clicker-assets)
echo ================================================================
echo.
call :r2_check_rclone
if %ERRORLEVEL% NEQ 0 ( pause & goto menu )

echo --- Cartelle ---
"%RCLONE_CMD%" lsd r2:espo-clicker-assets
echo.
echo --- Dimensione totale ---
"%RCLONE_CMD%" size r2:espo-clicker-assets
echo.
pause
goto menu
