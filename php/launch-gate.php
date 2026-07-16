<?php
/**
 * Gate di lancio v3.0 — countdown "coming soon" server-side.
 *
 * Prima del lancio, in PRODUZIONE, index.php e arcade.php servono SOLO la schermata
 * countdown (includes/countdown.php) e fanno exit: il bundle del gioco non viene
 * nemmeno inviato. localhost e /test/ restano SEMPRE aperti → i test continuano.
 * L'ora è autoritativa dal SERVER (time()), non dal browser (non falsificabile).
 *
 * ⚠️ LAUNCH_TS DEVE combaciare con LAUNCH_TIMESTAMP in
 *    src/core/migrations/v2-to-v3.ts (03/08/2026 09:00 ora italiana = 07:00 UTC).
 */

// --- Sorgente di verità unica del momento di lancio (epoch, UTC) ---
if (!defined('LAUNCH_TS'))       define('LAUNCH_TS', strtotime('2026-08-03 07:00:00 UTC')); // 03/08/2026 09:00 IT (CEST)

// --- Kill-switch manuale ---
//   ''     = automatico (blocca finché time() < LAUNCH_TS)
//   'open' = forza SBLOCCO (apri prima / dopo un rinvio)
//   'lock' = forza BLOCCO  (tieni chiuso oltre la data)
if (!defined('COUNTDOWN_FORCE')) define('COUNTDOWN_FORCE', '');

// --- Bypass tester: apri ?unlock=SECRET una volta → cookie 'espo_preview' (7 giorni) ---
// ⚠️ CAMBIA questa chiave prima del deploy in produzione.
if (!defined('UNLOCK_SECRET'))   define('UNLOCK_SECRET', 'espo-preview-CAMBIAMI');

/** True se l'host è produzione (non localhost/rete locale e non sotto /test/). */
function espo_is_production() {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    // SCRIPT_NAME = path dello script SENZA query → non aggirabile con ?x=/test/.
    $path = $_SERVER['SCRIPT_NAME'] ?? '';
    if (preg_match('/(localhost|127\.0\.0\.1|::1|192\.168\.|\.local|\.test)/i', $host)) return false;
    if (strpos($path, '/test/') !== false) return false;
    return true;
}

/** Decide se mostrare il countdown (blocco) invece del gioco. */
function espo_countdown_active() {
    if (COUNTDOWN_FORCE === 'open') return false; // forza sblocco
    if (COUNTDOWN_FORCE === 'lock') return true;  // forza blocco
    if (!espo_is_production()) {
        // dev/test: sempre aperto, ma ?countdown=1 mostra l'anteprima della schermata
        // (ignorato in produzione → nessun rischio di leak del gate).
        return isset($_GET['countdown']);
    }

    // Bypass tester: link segreto → salva cookie e sblocca
    if (isset($_GET['unlock']) && hash_equals(UNLOCK_SECRET, (string) $_GET['unlock'])) {
        setcookie('espo_preview', UNLOCK_SECRET, time() + 7 * 24 * 3600, '/');
        return false;
    }
    if (hash_equals(UNLOCK_SECRET, (string) ($_COOKIE['espo_preview'] ?? ''))) return false;

    return time() < LAUNCH_TS; // prima del lancio → blocca
}
