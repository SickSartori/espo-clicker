@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM  FIX STRUTTURA SUONI SU R2
REM  Allinea Cloudflare R2 alla nuova struttura locale:
REM    assets/sounds/{music,sfx,events,intro,esposion}/...
REM
REM  Cosa fa, in ordine SICURO:
REM    [1] copy  -> carica le sottocartelle locali su R2 (non cancella nulla)
REM    [2] delete --dry-run -> mostra gli orfani rimasti in ROOT
REM    [3] delete --max-depth 1 -> cancella SOLO i file in root (dopo conferma)
REM
REM  --max-depth 1 = tocca solo i file direttamente in assets/sounds/,
REM  MAI le sottocartelle (music/ sfx/ events/ intro/ esposion/ arcade/).
REM ============================================================

set "DEST=r2:espo-clicker-assets/assets/sounds"
set "SRC=%~dp0assets\sounds"

echo ============================================================
echo  FIX STRUTTURA SUONI -^> R2
echo ============================================================
echo.

call :check_rclone
if !ERRORLEVEL! NEQ 0 ( pause & exit /b 1 )

if not exist "%SRC%" ( echo  [ERR] Cartella locale non trovata: %SRC% & pause & exit /b 1 )

echo  rclone : !RCLONE_CMD!
echo  locale : %SRC%
echo  remote : %DEST%
echo.

REM --- PASSO 1: carica la struttura (copy NON cancella) ---
echo  [1/3] Carico la struttura locale su R2 (copy)...
"!RCLONE_CMD!" copy "%SRC%" "%DEST%" -P --transfers 4
if !ERRORLEVEL! NEQ 0 ( echo  [ERR] Upload fallito & pause & exit /b 1 )
echo  [OK] Sottocartelle caricate su R2.
echo.

REM --- PASSO 2: anteprima orfani in ROOT (nessuna cancellazione) ---
echo  [2/3] ANTEPRIMA - file in ROOT che verrebbero cancellati:
echo  ------------------------------------------------------------
"!RCLONE_CMD!" delete "%DEST%" --max-depth 1 --dry-run
echo  ------------------------------------------------------------
echo  (music/ sfx/ events/ intro/ esposion/ arcade/ NON vengono toccate)
echo.

REM --- conferma esplicita ---
set "CONFERMA="
set /p "CONFERMA=Cancello i file elencati qui sopra? scrivi SI e premi Invio: "
if /i not "!CONFERMA!"=="SI" (
    echo.
    echo  Annullato: nessun file cancellato.
    echo  NB: la struttura nuova e' comunque gia' stata caricata al passo 1.
    pause & exit /b 0
)

REM --- PASSO 3: delete reale (solo root) ---
echo.
echo  [3/3] Cancello gli orfani in root...
"!RCLONE_CMD!" delete "%DEST%" --max-depth 1
if !ERRORLEVEL! NEQ 0 ( echo  [ERR] Delete fallito & pause & exit /b 1 )
echo  [OK] Orfani rimossi.
echo.

REM --- verifica finale ---
echo ============================================================
echo  VERIFICA - sottocartelle ora su R2:
"!RCLONE_CMD!" lsf "%DEST%" --dirs-only
echo.
echo  File rimasti in ROOT (dovrebbe essere vuoto):
"!RCLONE_CMD!" lsf "%DEST%" --files-only --max-depth 1
echo ============================================================
echo  [FATTO] R2 allineato alla struttura locale.
pause
exit /b 0

REM ------------------------------------------------------------
:check_rclone
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
