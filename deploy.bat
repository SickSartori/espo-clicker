@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ================================================================
REM  ESPOOO CLICKER - Deploy Manager v3.0
REM ================================================================
REM Branch flow:
REM   develop-v3 -> lavoro locale, test rapidi
REM   test    -> server test (deploy auto via test.yml)
REM   main    -> produzione (deploy manuale via main.yml)
REM ================================================================

:menu
cls

REM ---- Status header: versione + branch + dirty status ----
for /f "tokens=2 delims=:, " %%v in ('findstr /r "\"version\"" package.json') do set raw=%%v
set version=!raw:"=!
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set current_branch=%%b
if "!current_branch!"=="" set current_branch=??
git diff --quiet 2>nul
if !ERRORLEVEL! EQU 0 (
    git diff --cached --quiet 2>nul
    if !ERRORLEVEL! EQU 0 ( set git_status=[CLEAN] ) else ( set git_status=[STAGED] )
) else ( set git_status=[DIRTY] )

echo ================================================================
echo   ESPOOO CLICKER - Deploy Manager
echo   Versione: !version!  ^|  Branch: !current_branch!  ^|  !git_status!
echo ================================================================
echo.
echo  [QUICK ACTIONS]
echo    1. RELEASE PATCH         (bump + cache + build) [CONSIGLIATO]
echo    2. BUILD + COMMIT + PUSH (-^> develop-v3)
echo    3. Build veloce          (no version bump)
echo.
echo  [VERSIONAMENTO]
echo    4. Bump MAJOR            (es: 3.x -^> 4.0)
echo    5. Bump MINOR            (es: 3.0 -^> 3.1)
echo    6. Solo CACHE BUMP       (no build)
echo.
echo  [GIT DEPLOY]
echo    7. develop-v3 -^> test    (auto-deploy test via FTP)
echo    8. test    -^> main       (release ufficiale + tag)
echo    9. Stato Git             (status + branch + log)
echo.
echo  [CLOUDFLARE R2]
echo   10. Sync TUTTI asset       (sounds + video + songs)
echo   11. Sync solo SOUNDS
echo   12. Sync solo VIDEO
echo   13. Sync solo SONGS
echo   14. Verifica bucket R2
echo.
echo  [UTILITY]
echo   15. Apri release notes
echo   16. Test su browser locale
echo   17. Pulisci dist/ + rebuild
echo.
echo    0. Esci
echo.
set /p choice="-> Scegli opzione: "

if "%choice%"=="1"  goto release_patch
if "%choice%"=="2"  goto build_commit_push
if "%choice%"=="3"  goto build
if "%choice%"=="4"  goto major
if "%choice%"=="5"  goto minor
if "%choice%"=="6"  goto cache_bump
if "%choice%"=="7"  goto push_test
if "%choice%"=="8"  goto push_main
if "%choice%"=="9"  goto git_status
if "%choice%"=="10" goto r2_sync_all
if "%choice%"=="11" goto r2_sync_sounds
if "%choice%"=="12" goto r2_sync_video
if "%choice%"=="13" goto r2_sync_songs
if "%choice%"=="14" goto r2_list
if "%choice%"=="15" goto open_releasenotes
if "%choice%"=="16" goto open_browser
if "%choice%"=="17" goto clean_rebuild
if "%choice%"=="0"  exit /b 0
goto menu

REM ================================================================
REM  QUICK ACTIONS
REM ================================================================

:release_patch
cls
echo.
echo ================================================================
echo  RELEASE PATCH
echo ================================================================
echo.
echo  Bumpa patch + invalida cache + build legacy + v3 in 1 step.
echo.
echo  Files aggiornati:
echo    * package.json
echo    * src/lib/version.ts
echo    * sw.js (CACHE_VERSION)
echo    * php/config.php (devVersion + prodVersion)
echo.
echo  Esempio: !version! -^> bump patch
echo.
set /p confirm="  Procedi? (s/N): "
if /i "!confirm!" NEQ "s" goto menu
echo.
call npm run release
if !ERRORLEVEL! EQU 0 (
    echo.
    echo  [OK] RELEASE completata
) else (
    echo.
    echo  [ERR] Errore release
)
echo.
pause
goto menu

:build
cls
echo.
echo ================================================================
echo  BUILD VELOCE (no bump)
echo ================================================================
echo.
echo  Compila legacy + v3 senza toccare versione/cache.
echo.
call npm run build
if !ERRORLEVEL! EQU 0 (
    echo.
    echo  [OK] Build completata
) else (
    echo.
    echo  [ERR] Errore build
)
echo.
pause
goto menu

REM ================================================================
REM  VERSIONAMENTO
REM ================================================================

:major
cls
echo.
echo ================================================================
echo  BUMP MAJOR VERSION
echo ================================================================
echo.
echo  MAJOR = cambio GRANDE, incompatibile
echo  Esempio: 3.0.1 -^> 4.0.0
echo.
set /p confirm="  Procedi? (s/N): "
if /i "!confirm!" NEQ "s" goto menu
call npm run bump:major
echo.
pause
goto menu

:minor
cls
echo.
echo ================================================================
echo  BUMP MINOR VERSION
echo ================================================================
echo.
echo  MINOR = nuove feature, fix, miglioramenti
echo  Esempio: 3.0.1 -^> 3.1.0
echo.
set /p confirm="  Procedi? (s/N): "
if /i "!confirm!" NEQ "s" goto menu
call npm run bump:minor
echo.
pause
goto menu

:cache_bump
cls
echo.
echo ================================================================
echo  SOLO CACHE BUMP (no build)
echo ================================================================
echo.
echo  Bumpa patch + sw.js + php/config.php.
echo  Niente compilazione bundle. Utile per forzare reload utenti
echo  quando hai modificato solo file non bundled.
echo.
call npm run cache:bump
echo.
pause
goto menu

REM ================================================================
REM  GIT DEPLOY
REM ================================================================

:build_commit_push
cls
echo.
echo ================================================================
echo  BUILD + COMMIT + PUSH -^> develop-v3
echo ================================================================
echo.

echo  STEP 1/4: Build...
call npm run build
if !ERRORLEVEL! NEQ 0 (
    echo  [ERR] Build fallito.
    pause
    goto menu
)
echo  [OK] Build OK
echo.

echo  STEP 2/4: Stage file...
call git add -A
echo  [OK] File pronti
echo.

echo  STEP 3/4: Commit
set /p msg="  Messaggio commit (vuoto = 'Build aggiornamento'): "
if "!msg!"=="" set msg=Build aggiornamento
call git commit -m "!msg!"
if !ERRORLEVEL! NEQ 0 (
    echo  [ERR] Niente da committare o errore.
    pause
    goto menu
)
echo.

echo  STEP 4/4: Push origin develop-v3...
call git push origin develop-v3
if !ERRORLEVEL! NEQ 0 (
    echo  [ERR] Push fallito.
    pause
    goto menu
)
echo.
echo  [OK] PUSH COMPLETATO
echo  Prossimo: opzione 7 per promuovere a test.
echo.
pause
goto menu

:push_test
cls
echo.
echo ================================================================
echo  PROMUOVI develop-v3 -^> test
echo ================================================================
echo.
echo  Forza test = develop-v3. Workflow test.yml partirà su GitHub.
echo.
set /p confirm="  Confermi push develop-v3 -^> test? (s/N): "
if /i "!confirm!" NEQ "s" goto menu

echo.
echo  Sync locale...
call git checkout develop-v3
call git pull origin develop-v3
if !ERRORLEVEL! NEQ 0 ( echo  [ERR] Pull fallito & pause & goto menu )

echo.
echo  Force push test = develop-v3...
call git push --force origin develop-v3:test
if !ERRORLEVEL! NEQ 0 ( echo  [ERR] Push fallito & pause & goto menu )

echo.
echo  [OK] test aggiornato
echo  Monitora: https://github.com/SickSartori/espo-clicker/actions
pause
goto menu

:push_main
cls
echo.
echo ================================================================
echo  PROMUOVI test -^> main (RELEASE UFFICIALE)
echo ================================================================
echo.
echo  Merge test -^> main + tag v!version!.
echo  Deploy produzione: avviare MANUALMENTE da GitHub Actions.
echo.
set /p confirm="  Confermi release v!version!? (s/N): "
if /i "!confirm!" NEQ "s" goto menu

echo.
echo  Merge test -^> main...
call git checkout main
call git merge test --no-ff -m "Release v!version!"
if !ERRORLEVEL! NEQ 0 ( echo  [ERR] Merge fallito & pause & goto menu )

echo.
echo  Creo tag v!version!...
call git tag -a "v!version!" -m "Release v!version!"
call git push origin main
call git push origin "v!version!"
call git checkout develop-v3

echo.
echo  [OK] Release v!version! pubblicata su main
echo  Avvia deploy prod: https://github.com/SickSartori/espo-clicker/actions
pause
goto menu

:git_status
cls
echo.
echo ================================================================
echo  STATO GIT
echo ================================================================
echo.
echo  --- BRANCH CORRENTE ---
call git rev-parse --abbrev-ref HEAD
echo.
echo  --- STATUS ---
call git status -s
echo.
echo  --- ULTIMI 5 COMMIT ---
call git log --oneline -5
echo.
echo  --- BRANCH LOCALI ---
call git branch
echo.
pause
goto menu

REM ================================================================
REM  CLOUDFLARE R2
REM ================================================================

:r2_check_rclone
where rclone >nul 2>nul
if !ERRORLEVEL! EQU 0 (
    set "RCLONE_CMD=rclone"
    exit /b 0
)
if exist "C:\rclone\rclone.exe" (
    set "RCLONE_CMD=C:\rclone\rclone.exe"
    exit /b 0
)
if exist "%USERPROFILE%\Downloads\rclone-v1.73.5-windows-amd64\rclone-v1.73.5-windows-amd64\rclone.exe" (
    set "RCLONE_CMD=%USERPROFILE%\Downloads\rclone-v1.73.5-windows-amd64\rclone-v1.73.5-windows-amd64\rclone.exe"
    exit /b 0
)
echo  [ERR] rclone non trovato.
echo        Installa: https://rclone.org/install/
exit /b 1

:r2_sync_all
cls
echo.
echo ================================================================
echo  SYNC TUTTI ASSET -^> R2
echo ================================================================
echo.
call :r2_check_rclone
if !ERRORLEVEL! NEQ 0 ( pause & goto menu )

echo  [1/3] Sync assets/sounds...
"!RCLONE_CMD!" copy "%~dp0assets\sounds" r2:espo-clicker-assets/assets/sounds -P --transfers 4
if !ERRORLEVEL! NEQ 0 ( echo  [ERR] Sounds fail & pause & goto menu )

echo.
echo  [2/3] Sync assets/video...
"!RCLONE_CMD!" copy "%~dp0assets\video" r2:espo-clicker-assets/assets/video -P --transfers 4
if !ERRORLEVEL! NEQ 0 ( echo  [ERR] Video fail & pause & goto menu )

echo.
echo  [3/3] Sync music/songs...
"!RCLONE_CMD!" copy "%~dp0music\songs" r2:espo-clicker-assets/music/songs -P --transfers 4
if !ERRORLEVEL! NEQ 0 ( echo  [ERR] Songs fail & pause & goto menu )

echo.
echo  [OK] Tutti asset sincronizzati R2
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
if !ERRORLEVEL! NEQ 0 ( pause & goto menu )
"!RCLONE_CMD!" copy "%~dp0assets\sounds" r2:espo-clicker-assets/assets/sounds -P --transfers 4
echo.
if !ERRORLEVEL! EQU 0 ( echo  [OK] Sounds sync OK ) else ( echo  [ERR] Sync fallito )
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
if !ERRORLEVEL! NEQ 0 ( pause & goto menu )
"!RCLONE_CMD!" copy "%~dp0assets\video" r2:espo-clicker-assets/assets/video -P --transfers 4
echo.
if !ERRORLEVEL! EQU 0 ( echo  [OK] Video sync OK ) else ( echo  [ERR] Sync fallito )
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
if !ERRORLEVEL! NEQ 0 ( pause & goto menu )
"!RCLONE_CMD!" copy "%~dp0music\songs" r2:espo-clicker-assets/music/songs -P --transfers 4
echo.
if !ERRORLEVEL! EQU 0 (
    echo  [OK] Songs sync OK
    echo  Ricorda di aggiornare music/songs.json
) else (
    echo  [ERR] Sync fallito
)
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
if !ERRORLEVEL! NEQ 0 ( pause & goto menu )

echo  --- Cartelle ---
"!RCLONE_CMD!" lsd r2:espo-clicker-assets
echo.
echo  --- Dimensione totale ---
"!RCLONE_CMD!" size r2:espo-clicker-assets
echo.
pause
goto menu

REM ================================================================
REM  UTILITY
REM ================================================================

:open_releasenotes
start "" "release-notes_it.md"
goto menu

:open_browser
cls
echo.
echo  Apro http://localhost/Espo_Clicker/ nel browser default...
start "" "http://localhost/Espo_Clicker/"
goto menu

:clean_rebuild
cls
echo.
echo ================================================================
echo  PULISCI dist/ + REBUILD
echo ================================================================
echo.
echo  Cancella dist/ + dist-v3/ poi build pulito.
echo.
set /p confirm="  Procedi? (s/N): "
if /i "!confirm!" NEQ "s" goto menu

echo.
echo  Pulizia dist/...
if exist dist rmdir /s /q dist
if exist dist-v3 rmdir /s /q dist-v3
echo  [OK] Pulizia OK

echo.
echo  Rebuild...
call npm run build
if !ERRORLEVEL! EQU 0 (
    echo.
    echo  [OK] REBUILD completato
) else (
    echo.
    echo  [ERR] Errore build
)
echo.
pause
goto menu
