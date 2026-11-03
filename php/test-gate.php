<?php
/**
 * Accesso all'area di test (/test/) — v3.3, issue #40.
 *
 * Sotto /test/ il gioco si apre solo dopo un login: chi ci arriva per sbaglio vede
 * la richiesta di accesso e basta, il bundle del gioco non parte nemmeno.
 * In produzione è tutto spento: le stesse pagine arrivano anche lì via FTP, quindi
 * la decisione sta su SCRIPT_NAME (come espo_is_production), mai sulla query.
 *
 *  - Admin iniziale: secrets('test_gate'), cioè i secret TEST_ADMIN_USER e
 *    TEST_ADMIN_PASSWORD. Se il secret cambia, al primo accesso l'admin viene
 *    reimpostato: è la via di recupero di una password dimenticata.
 *    Senza admin configurato /test/ resta chiuso, con un avviso.
 *  - Tester: li crea l'admin (php/test-access.php) con una password temporanea,
 *    mostrata una volta sola e da cambiare al primo accesso. Solo l'admin reimposta.
 *  - Utenti e chiave di firma: php/data/test-gate.php, creato qui al primo uso, fuori
 *    da git e dall'FTP (che non cancella i file che non ha caricato). Il file comincia
 *    con un «exit» PHP: dal web è illeggibile anche dove .htaccess non vale.
 *  - Sessione: cookie firmato (HMAC), non le sessioni PHP, che sull'hosting condiviso
 *    scadono dopo 24 minuti. Ogni utente ha una versione: reset, cambio password e
 *    disattivazione la alzano, e i cookie vecchi smettono di valere.
 *
 * In locale e negli E2E si accende con ESPO_TEST_GATE=1, solo su localhost: il flag
 * può accendere il cancello, mai spegnerlo sotto /test/.
 */
require_once __DIR__ . '/secrets-load.php';

const TG_COOKIE       = 'espo_test_auth';
const TG_CSRF_COOKIE  = 'espo_test_csrf';
const TG_TTL          = 2592000;   // 30 giorni
const TG_MAX_FAILS    = 10;        // tentativi sbagliati per indirizzo…
const TG_FAIL_WINDOW  = 900;       // …in 15 minuti
const TG_MIN_PASSWORD = 10;
const TG_STORE_HEAD   = "<?php exit; ?>\n";

// ── Dove siamo ───────────────────────────────────────────────

function tg_local_host()
{
    $host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
    return in_array($host, array('localhost', '127.0.0.1', '[::1]'), true);
}

function tg_local_flag()
{
    return getenv('ESPO_TEST_GATE') === '1' && tg_local_host();
}

/** Acceso sotto /test/ (dal percorso dello script, non aggirabile con la query) o col flag locale. */
function tg_enabled()
{
    return strpos($_SERVER['SCRIPT_NAME'] ?? '', '/test/') !== false || tg_local_flag();
}

/** Radice dell'area: '/test/' (o quella che la contiene); in locale '/'. Vale per i cookie e per i link. */
function tg_base()
{
    $path = $_SERVER['SCRIPT_NAME'] ?? '/';
    $i = strpos($path, '/test/');
    return $i !== false ? substr($path, 0, $i + 6) : '/';
}

function tg_https()
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

function tg_dir()
{
    $custom = tg_local_flag() ? getenv('ESPO_TEST_GATE_DIR') : false;
    return rtrim($custom ? $custom : __DIR__ . '/data', '/\\');
}

// ── Archivio ─────────────────────────────────────────────────

/**
 * Legge l'archivio sotto lock esclusivo, lo passa a $fn (per riferimento) e lo
 * riscrive solo se è cambiato, con un file temporaneo e una rename.
 * Un archivio che c'è ma non si legge NON viene sovrascritto: si perderebbero gli utenti.
 */
function tg_store(callable $fn)
{
    $dir = tg_dir();
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException("cartella dati non creabile: $dir");
    }
    if (!file_exists("$dir/.htaccess")) {
        @file_put_contents("$dir/.htaccess", "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Deny from all\n</IfModule>\n");
    }
    $lock = @fopen("$dir/test-gate.lock", 'c');
    if (!$lock || !flock($lock, LOCK_EX)) {
        throw new RuntimeException('lock dell\'archivio non disponibile');
    }
    try {
        $file = "$dir/test-gate.php";
        $st = null;
        if (is_file($file)) {
            $raw = (string) file_get_contents($file);
            if (strncmp($raw, TG_STORE_HEAD, strlen(TG_STORE_HEAD)) === 0) {
                $st = json_decode(substr($raw, strlen(TG_STORE_HEAD)), true);
            }
            if (!is_array($st)) {
                throw new RuntimeException('archivio illeggibile: ' . $file);
            }
        } else {
            $st = array('v' => 1, 'secret' => bin2hex(random_bytes(32)), 'admin_fp' => '', 'users' => array(), 'fails' => array());
        }
        $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
        $before = is_file($file) ? json_encode($st, $flags) : null;
        $out = $fn($st);
        $after = json_encode($st, $flags);
        if ($after !== $before) {
            // .php e con lo stesso «exit» in testa: se la rename fallisse, il temporaneo resterebbe illeggibile come l'archivio
            $tmp = "$dir/test-gate.tmp.php";
            if (file_put_contents($tmp, TG_STORE_HEAD . $after, LOCK_EX) === false || !rename($tmp, $file)) {
                throw new RuntimeException('archivio non scrivibile: ' . $file);
            }
        }
        return $out;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

// ── Utenti ───────────────────────────────────────────────────

/**
 * 3-20 caratteri fra lettere, numeri, . _ -: il nome è anche quello dell'account di gioco, e
 * login-register (Supabase dev) accetta al massimo 20 caratteri. Niente spazi né accenti,
 * che il gioco accetterebbe: nomi semplici da scrivere e da passare in giro.
 */
function tg_valid_name($name)
{
    return is_string($name) && preg_match('/^[A-Za-z0-9][A-Za-z0-9_.-]{2,19}$/', $name) === 1;
}

/**
 * Password dell'account di gioco collegato al tester (login unico). Deriva dalla chiave
 * dell'archivio, dal nome ESATTO (login-register distingue le maiuscole) e da un valore casuale
 * dell'utente: non si salva da nessuna parte e resta la stessa a ogni accesso. Il valore casuale
 * fa sì che un tester eliminato e ricreato con lo stesso nome non ritrovi l'account di gioco di
 * prima (chi c'era prima potrebbe conoscerne la password). Chi non lo ha (creato prima del 03/11)
 * tiene la password di allora. Se l'archivio si perde cambia per tutti.
 */
function tg_game_password(array $st, $key)
{
    $user = $st['users'][$key];
    $salt = (string) ($user['game_salt'] ?? '');
    return 'Tg' . substr(tg_b64(hash_hmac('sha256', 'game|' . $user['name'] . ($salt !== '' ? '|' . $salt : ''), $st['secret'], true)), 0, 22);
}

function tg_new_game_salt()
{
    return bin2hex(random_bytes(8));
}

/** Admin dai secret; in locale col flag anche da ESPO_TEST_ADMIN_USER / _PASSWORD. Null se manca o non è valido. */
function tg_admin_config()
{
    if (tg_local_flag() && getenv('ESPO_TEST_ADMIN_USER') !== false) {
        $user = (string) getenv('ESPO_TEST_ADMIN_USER');
        $pass = (string) getenv('ESPO_TEST_ADMIN_PASSWORD');
    } else {
        $cfg = secrets('test_gate');
        $user = $cfg['admin_user'] ?? '';
        $pass = $cfg['admin_password'] ?? '';
        if (secrets_is_placeholder($user) || secrets_is_placeholder($pass)) {
            return null;
        }
    }
    // Valori presenti ma non validi: /test/ resta chiuso, e il log del server dice perché
    if (!tg_valid_name($user)) {
        error_log('[test-gate] admin dei secret ignorato: il nome deve avere 3-20 caratteri fra lettere, numeri, . _ -');
        return null;
    }
    if (strlen($pass) < TG_MIN_PASSWORD) {
        error_log('[test-gate] admin dei secret ignorato: la password deve avere almeno ' . TG_MIN_PASSWORD . ' caratteri');
        return null;
    }
    return array('user' => $user, 'password' => $pass);
}

/**
 * Crea l'admin dei secret se manca, o lo reimposta se il secret è cambiato (l'impronta
 * è un HMAC con la chiave dell'archivio: la password non ci finisce in chiaro).
 */
function tg_bootstrap(array &$st)
{
    $cfg = tg_admin_config();
    if (!$cfg) {
        return;
    }
    $key = strtolower($cfg['user']);
    $fp = hash_hmac('sha256', $key . "\0" . $cfg['password'], $st['secret']);
    if (isset($st['users'][$key]) && hash_equals((string) $st['admin_fp'], $fp)) {
        return;
    }
    $user = $st['users'][$key] ?? array('name' => $cfg['user'], 'created' => time(), 'created_by' => 'deploy', 'ver' => 0, 'game_salt' => tg_new_game_salt(), 'uid' => tg_new_game_salt());
    $user['hash'] = password_hash($cfg['password'], PASSWORD_DEFAULT);
    $user['role'] = 'admin';
    $user['must_change'] = false;
    $user['disabled'] = false;
    $user['ver'] = (int) $user['ver'] + 1;
    $st['users'][$key] = $user;
    $st['admin_fp'] = $fp;
}

function tg_admins(array $st)
{
    $n = 0;
    foreach ($st['users'] as $u) {
        if (($u['role'] ?? '') === 'admin' && empty($u['disabled'])) $n++;
    }
    return $n;
}

/** 14 caratteri senza quelli che si confondono (0/O, 1/l/I). */
function tg_temp_password()
{
    $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    $out = '';
    for ($i = 0; $i < 14; $i++) {
        $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return $out;
}

/** Null se va bene, altrimenti il motivo (da mostrare). */
function tg_password_problem($new, $confirm, $oldHash)
{
    if (!is_string($new) || strlen($new) < TG_MIN_PASSWORD) return 'La password deve avere almeno ' . TG_MIN_PASSWORD . ' caratteri.';
    if (strlen($new) > 200) return 'La password è troppo lunga.';
    if ($new !== $confirm) return 'Le due password non coincidono.';
    if ($oldHash && password_verify($new, $oldHash)) return 'Deve essere diversa da quella di adesso.';
    return null;
}

// ── Cookie ───────────────────────────────────────────────────

function tg_b64($s)
{
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

function tg_setcookie($name, $value, $expires)
{
    setcookie($name, $value, array(
        'expires' => $expires, 'path' => tg_base(), 'secure' => tg_https(), 'httponly' => true, 'samesite' => 'Lax',
    ));
}

/**
 * Il cookie porta nome, versione e un id casuale dell'utente: senza l'id, un tester eliminato e
 * ricreato con lo stesso nome ripartirebbe dalla stessa versione, e il cookie di chi c'era prima
 * tornerebbe valido. Gli utenti creati prima del 03/11 non hanno id: vale come vuoto da entrambe le parti.
 */
function tg_login_cookie(array $st, $key)
{
    $exp = time() + TG_TTL;
    $payload = tg_b64(json_encode(array('u' => $key, 'v' => (int) $st['users'][$key]['ver'], 'i' => (string) ($st['users'][$key]['uid'] ?? ''), 'e' => $exp)));
    tg_setcookie(TG_COOKIE, $payload . '.' . hash_hmac('sha256', "auth|$payload", $st['secret']), $exp);
}

function tg_logout_cookie()
{
    tg_setcookie(TG_COOKIE, '', time() - 3600);
}

/** Utente del cookie, se il cookie è integro, non scaduto e della versione giusta. */
function tg_current(array $st)
{
    $cookie = $_COOKIE[TG_COOKIE] ?? '';
    if (!is_string($cookie) || substr_count($cookie, '.') !== 1) return null;
    list($payload, $sig) = explode('.', $cookie);
    if (!hash_equals(hash_hmac('sha256', "auth|$payload", $st['secret']), $sig)) return null;
    $data = json_decode((string) base64_decode(strtr($payload, '-_', '+/')), true);
    if (!is_array($data) || (int) ($data['e'] ?? 0) < time()) return null;
    $key = (string) ($data['u'] ?? '');
    $user = $st['users'][$key] ?? null;
    if (!$user || !empty($user['disabled']) || (int) $user['ver'] !== (int) ($data['v'] ?? -1)) return null;
    if (!hash_equals((string) ($user['uid'] ?? ''), (string) ($data['i'] ?? ''))) return null;
    return array('key' => $key, 'user' => $user);
}

/** Token anti-CSRF «double submit»: un cookie casuale ripetuto nel form. Va chiesto prima di stampare. */
function tg_csrf_token()
{
    $t = $_COOKIE[TG_CSRF_COOKIE] ?? '';
    if (!is_string($t) || !preg_match('/^[a-f0-9]{32}$/', $t)) {
        $t = bin2hex(random_bytes(16));
        tg_setcookie(TG_CSRF_COOKIE, $t, 0);
        $_COOKIE[TG_CSRF_COOKIE] = $t;
    }
    return $t;
}

function tg_csrf_ok()
{
    $c = $_COOKIE[TG_CSRF_COOKIE] ?? '';
    $p = $_POST['csrf'] ?? '';
    return is_string($c) && $c !== '' && is_string($p) && hash_equals($c, $p);
}

/**
 * Chiave del limite dei tentativi: indirizzo + nome tentato. Col solo indirizzo, dietro un
 * proxy condiviso gli errori di uno bloccherebbero tutti, admin compreso. IP e nome non
 * finiscono in chiaro nell'archivio.
 */
function tg_client_tag(array $st, $name)
{
    return substr(hash_hmac('sha256', 'ip|' . ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . strtolower((string) $name), $st['secret']), 0, 16);
}

function tg_prune_fails(array &$st)
{
    $limit = time() - TG_FAIL_WINDOW;
    foreach ($st['fails'] as $tag => $list) {
        $list = array_values(array_filter($list, function ($t) use ($limit) { return $t > $limit; }));
        if ($list) $st['fails'][$tag] = $list; else unset($st['fails'][$tag]);
    }
}

/** Secondi di attesa se l'indirizzo ha finito i tentativi, altrimenti 0. */
function tg_locked_for(array $st, $tag)
{
    $list = $st['fails'][$tag] ?? array();
    return count($list) < TG_MAX_FAILS ? 0 : max(1, min($list) + TG_FAIL_WINDOW - time());
}

/** Torna solo dentro l'area: niente URL esterni o «//host». */
function tg_safe_return($r)
{
    $base = tg_base();
    if (!is_string($r) || strpos($r, $base) !== 0 || preg_match('#//|\\\\|[\r\n]#', substr($r, 1))) return $base;
    return $r;
}

function tg_access_url($query = '')
{
    return tg_base() . 'php/test-access.php' . ($query !== '' ? '?' . $query : '');
}

// ── Pagine ───────────────────────────────────────────────────

function tg_h($s)
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

/**
 * Pagina del cancello. Mai 200 per login e cambio password: il service worker del gioco
 * mette in cache le navigazioni andate bene, e al posto del gioco servirebbe questa.
 * Per lo stesso motivo lo script in fondo toglie service worker e cache, come il countdown.
 */
function tg_page($title, $body, $status)
{
    http_response_code($status);
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: same-origin');
    echo '<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">'
        . '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
        . '<meta name="robots" content="noindex, nofollow">'
        . '<title>' . tg_h($title) . ' · Espòòò Clicker (test)</title>'
        . '<link rel="icon" type="image/svg+xml" href="' . tg_h(tg_base() . 'assets/image/ico.svg') . '">'
        . '<link rel="preconnect" href="https://fonts.googleapis.com">'
        . '<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet">'
        . '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">'
        . '<style>' . tg_css() . '</style></head><body><div class="tg-fx" aria-hidden="true"></div>' . $body
        . '<script>try{if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(x){x.unregister();});});}'
        . 'if(window.caches&&caches.keys){caches.keys().then(function(k){k.forEach(function(n){caches.delete(n);});});}}catch(e){}</script>'
        . '</body></html>';
}

/**
 * Lo stesso «terminale» del login del gioco (styles/ui/desktop/login-modal.css: scena con griglia
 * esagonale, HUD con angoli, logo con alone, campi con icona, pulsante con riflesso), ma con
 * l'accento ambra e il nastro da area riservata: a colpo d'occhio è un'altra porta.
 */
function tg_css()
{
    return <<<'CSS'
:root{color-scheme:dark;--a:#ffb020;--a-soft:rgba(255,176,32,.62);--a-dim:rgba(255,176,32,.2);--cyan:#00d9ff;--text:#eef3fa;--dim:rgba(160,174,194,.8);--danger:#f87171;--ok:#34d399;--mono:'JetBrains Mono',ui-monospace,Consolas,monospace}
*{box-sizing:border-box}
html{background:#030307}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:44px 16px;color:var(--text);font:16px/1.5 'Rajdhani',system-ui,sans-serif;
  background:radial-gradient(ellipse 60% 45% at 50% 40%,rgba(255,176,32,.09) 0%,transparent 60%),radial-gradient(ellipse 120% 120% at 50% 50%,transparent 30%,rgba(2,3,8,.85) 78%,#010205 100%),linear-gradient(180deg,#0b0b10 0%,#030307 100%)}
.tg-fx{position:fixed;inset:0;pointer-events:none;z-index:0;background:
  repeating-linear-gradient(0deg,rgba(0,0,0,0) 0,rgba(0,0,0,0) 2px,rgba(0,0,0,.2) 3px,rgba(0,0,0,0) 4px),
  repeating-linear-gradient(60deg,transparent 0,transparent 38px,rgba(255,176,32,.04) 39px,transparent 40px),
  repeating-linear-gradient(-60deg,transparent 0,transparent 38px,rgba(255,176,32,.04) 39px,transparent 40px)}
.tg-hud{position:relative;z-index:1;width:min(92vw,420px);padding:38px 34px 22px;border-radius:14px;
  background:linear-gradient(180deg,rgba(16,13,8,.78) 0%,rgba(6,6,9,.88) 100%);border:1px solid var(--a-dim);
  -webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px);box-shadow:0 0 0 1px rgba(255,176,32,.08),0 30px 90px rgba(0,0,0,.7),0 0 90px rgba(255,176,32,.08)}
.tg-hud.wide{width:min(94vw,900px)}
.tg-tape{position:absolute;top:0;left:14px;right:14px;height:5px;border-radius:0 0 3px 3px;opacity:.9;
  background:repeating-linear-gradient(-45deg,var(--a) 0 9px,#141008 9px 18px);box-shadow:0 0 14px rgba(255,176,32,.35)}
.tg-corner{position:absolute;width:18px;height:18px;border:2px solid var(--a);opacity:.75;pointer-events:none}
.tg-corner.tl{top:-2px;left:-2px;border-right:0;border-bottom:0;border-radius:6px 0 0 0}
.tg-corner.tr{top:-2px;right:-2px;border-left:0;border-bottom:0;border-radius:0 6px 0 0}
.tg-corner.bl{bottom:-2px;left:-2px;border-right:0;border-top:0;border-radius:0 0 0 6px}
.tg-corner.br{bottom:-2px;right:-2px;border-left:0;border-top:0;border-radius:0 0 6px 0}
.tg-bar{display:flex;justify-content:space-between;gap:12px;font:600 9.5px/1.4 var(--mono);letter-spacing:2px;text-transform:uppercase;color:var(--a-soft);margin-bottom:18px}
.tg-dot{color:var(--a);animation:tg-blink 1.6s steps(1) infinite}
@keyframes tg-blink{0%,60%{opacity:1}61%,100%{opacity:.25}}
.tg-logo-wrap{position:relative;width:110px;margin:0 auto 10px;text-align:center}
.tg-logo-wrap::before{content:'';position:absolute;top:50%;left:50%;width:190px;height:190px;transform:translate(-50%,-50%);z-index:-1;
  background:radial-gradient(circle,rgba(255,176,32,.24) 0%,rgba(255,176,32,.07) 42%,transparent 70%);animation:tg-halo 4s ease-in-out infinite alternate}
@keyframes tg-halo{from{transform:translate(-50%,-50%) scale(1);opacity:.65}to{transform:translate(-50%,-50%) scale(1.16);opacity:1}}
.tg-logo{display:block;width:78px;height:auto;margin:0 auto;filter:drop-shadow(0 0 14px rgba(0,217,255,.45)) drop-shadow(0 0 30px rgba(255,176,32,.25));animation:tg-float 3.6s ease-in-out infinite}
@keyframes tg-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.tg-badge{position:absolute;right:-8px;bottom:2px;padding:2px 8px;border-radius:4px;background:var(--a);color:#160f00;font:800 10px/1.4 var(--mono);letter-spacing:2px;transform:rotate(-8deg);box-shadow:0 0 14px rgba(255,176,32,.6)}
h1{margin:4px 0 2px;text-align:center;font:800 14px/1.4 var(--mono);letter-spacing:4px;text-transform:uppercase;color:#fff}
.tg-tagline{margin:2px auto 22px;text-align:center;font:400 10.5px/1.7 var(--mono);letter-spacing:1.4px;text-transform:uppercase;color:var(--dim)}
.tg-tagline .pp{color:var(--a);margin-right:6px}
.tg-caret{display:inline-block;width:7px;height:12px;margin-left:3px;vertical-align:-1px;background:var(--a);box-shadow:0 0 8px var(--a-soft);animation:tg-blink 1.05s steps(1) infinite}
p{margin:0 0 12px}.dim{color:var(--dim);font-size:.98rem}strong{color:#fff}
.tg-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.tg-fields{display:flex;flex-direction:column;gap:12px}
.tg-input{position:relative;display:flex;align-items:center;background:rgba(3,4,8,.7);border:1px solid var(--a-dim);border-radius:8px;overflow:hidden;transition:border-color .22s,box-shadow .22s}
.tg-input:focus-within{border-color:var(--a);box-shadow:0 0 0 3px rgba(255,176,32,.13),0 0 26px rgba(255,176,32,.18)}
.tg-input::after{content:'';position:absolute;bottom:0;left:50%;width:0;height:2px;transform:translateX(-50%);background:linear-gradient(90deg,transparent,var(--a),transparent);transition:width .3s cubic-bezier(.16,1,.3,1)}
.tg-input:focus-within::after{width:100%}
.tg-input .ic{flex:none;width:44px;height:46px;display:flex;align-items:center;justify-content:center;color:var(--a-soft);border-right:1px solid rgba(255,176,32,.12);font-size:13px}
.tg-input:focus-within .ic{color:var(--a);text-shadow:0 0 8px var(--a-soft)}
.tg-input input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:#fff;font:13px var(--mono);letter-spacing:.5px;padding:13px 14px}
.tg-input input::placeholder{color:rgba(160,174,194,.5);text-transform:uppercase;letter-spacing:1px;font-size:11px}
.tg-submit,.btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;text-decoration:none;
  padding:0 18px;height:44px;border-radius:8px;border:1px solid var(--a);color:#fff;font:800 12px var(--mono);letter-spacing:2.5px;text-transform:uppercase;
  background:linear-gradient(135deg,rgba(255,176,32,.28) 0%,rgba(220,140,20,.18) 100%);text-shadow:0 0 8px var(--a-soft);
  box-shadow:0 0 0 1px rgba(255,176,32,.16),0 8px 24px rgba(0,0,0,.45),0 0 22px rgba(255,176,32,.2);transition:transform .2s,box-shadow .2s,background .2s}
.tg-submit{width:100%;height:50px;margin-top:22px;font-size:13px;letter-spacing:3px}
.tg-submit i,.btn i{color:var(--a);filter:drop-shadow(0 0 8px rgba(255,176,32,.8))}
.tg-submit::before,.btn::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18) 50%,transparent);transition:left .6s ease}
.tg-submit:hover,.btn:hover{background:linear-gradient(135deg,rgba(255,176,32,.45) 0%,rgba(220,140,20,.3) 100%);transform:translateY(-2px);box-shadow:0 0 0 1px rgba(255,176,32,.4),0 12px 32px rgba(0,0,0,.55),0 0 40px rgba(255,176,32,.45)}
.tg-submit:hover::before,.btn:hover::before{left:100%}
.tg-submit:active,.btn:active{transform:translateY(0) scale(.98)}
button.ghost,.btn.ghost{background:transparent;color:var(--a);box-shadow:none;text-shadow:none}
button.ghost i,.btn.ghost i{filter:none}
.tg-plain{display:block;width:100%;margin-top:10px;background:transparent;border:0;color:var(--dim);font:600 10px var(--mono);letter-spacing:2px;text-transform:uppercase;cursor:pointer;padding:8px}
.tg-plain:hover{color:var(--a)}
button.small{height:30px;padding:0 10px;font-size:10px;letter-spacing:1.5px;margin:0}
button.danger{background:transparent;border-color:rgba(248,113,113,.6);color:var(--danger);box-shadow:none;text-shadow:none}
button.danger i{color:var(--danger);filter:none}
.tg-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:20px;padding-top:14px;border-top:1px solid rgba(255,176,32,.12);
  font:600 9.5px var(--mono);letter-spacing:1.5px;text-transform:uppercase;color:rgba(160,174,194,.55)}
.tg-foot a{color:var(--a-soft);text-decoration:none}.tg-foot a:hover{color:var(--a);text-shadow:0 0 8px var(--a-soft)}
.err,.ok{margin:0 0 16px;padding:10px 14px;border-radius:8px;font:12px/1.5 var(--mono);letter-spacing:.3px}
.err{border:1px solid rgba(248,113,113,.45);border-left:3px solid var(--danger);background:rgba(248,113,113,.08);color:#ffd5d5}
.ok{border:1px solid rgba(52,211,153,.4);border-left:3px solid var(--ok);background:rgba(52,211,153,.07);color:#d6fff0}
.ok p{margin:0 0 8px}
code.secret{display:inline-block;padding:8px 14px;font:800 18px var(--mono);letter-spacing:.12em;color:#fff;background:rgba(3,4,8,.8);border:1px dashed var(--ok);border-radius:6px;user-select:all;text-shadow:0 0 10px rgba(52,211,153,.5)}
.tg-head{display:flex;align-items:center;gap:16px;margin-bottom:16px}
.tg-head .tg-logo-wrap{width:64px;margin:0}.tg-head .tg-logo-wrap::before{width:120px;height:120px}.tg-head .tg-logo{width:54px}.tg-head .tg-badge{right:-14px;bottom:-4px;font-size:8.5px}
.tg-head h1{text-align:left;margin:0}.tg-head p{margin:2px 0 0}
.bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:6px}.bar form{margin:0}
.card{margin:16px 0 0;padding:18px 20px;border-radius:10px;border:1px solid rgba(255,176,32,.14);background:rgba(3,4,8,.45)}
.card h2{margin:0 0 6px;font:800 11px var(--mono);letter-spacing:3px;text-transform:uppercase;color:var(--a)}
.card .tg-input{margin-top:8px}
.card form .btn,.card form button[type=submit]:not(.small){margin-top:12px}
table{width:100%;border-collapse:collapse;font:13px var(--mono)}
th,td{text-align:left;padding:10px 8px;border-bottom:1px solid rgba(255,176,32,.1);vertical-align:middle}
th{font-size:9.5px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--dim)}
td strong{font-family:'Rajdhani',sans-serif;font-size:16px}
td.actions{display:flex;gap:6px;flex-wrap:wrap}td.actions form{margin:0}
.tag{font:600 9.5px var(--mono);letter-spacing:1.5px;text-transform:uppercase;padding:3px 8px;border-radius:999px;border:1px solid rgba(160,174,194,.35);color:var(--dim);white-space:nowrap}
.tag.warn{border-color:rgba(255,176,32,.6);color:var(--a)}.tag.off{border-color:rgba(248,113,113,.6);color:var(--danger)}.tag.on{border-color:rgba(52,211,153,.5);color:var(--ok)}
@media (max-width:640px){.tg-hud{padding:30px 20px 18px}.tg-bar span:last-child{display:none}
  /* tabella a schede: nome, ruolo e stato su una riga, le azioni sotto */
  table,tbody{display:block}thead{display:none}
  tr{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:12px 0;border-bottom:1px solid rgba(255,176,32,.1)}
  td{border:0;padding:0}td.hide{display:none}td.actions{flex-basis:100%}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
CSS;
}

/** Il pannello dell'HUD: angoli, nastro, barra in alto; `$logo` mette il logo grande col bollino TEST. */
function tg_hud($inner, $bar, $wide = false, $logo = true)
{
    return '<main class="tg-hud' . ($wide ? ' wide' : '') . '">'
        . '<span class="tg-corner tl" aria-hidden="true"></span><span class="tg-corner tr" aria-hidden="true"></span>'
        . '<span class="tg-corner bl" aria-hidden="true"></span><span class="tg-corner br" aria-hidden="true"></span>'
        . '<span class="tg-tape" aria-hidden="true"></span>'
        . '<div class="tg-bar" aria-hidden="true"><span>[ ' . tg_h($bar) . ' ]</span><span><span class="tg-dot">&#9679;</span> accesso riservato</span></div>'
        . ($logo ? tg_logo() : '')
        . $inner . '</main>';
}

function tg_logo()
{
    // la sola icona: logo.svg ha già la scritta, e il bollino TEST ci finirebbe sopra
    return '<div class="tg-logo-wrap"><img class="tg-logo" src="' . tg_h(tg_base() . 'assets/image/ico.svg') . '" alt="Espòòò Clicker"><span class="tg-badge">TEST</span></div>';
}

function tg_foot()
{
    return '<div class="tg-foot"><span>canale di prova</span><a href="/">gioco pubblico &#8599;</a></div>';
}

function tg_hidden($name, $value)
{
    return '<input type="hidden" name="' . tg_h($name) . '" value="' . tg_h($value) . '">';
}

/** Campo con icona, come nel login del gioco; l'etichetta resta per i lettori di schermo. */
function tg_field($id, $label, $icon, $attrs)
{
    return '<label class="tg-sr" for="' . tg_h($id) . '">' . tg_h($label) . '</label>'
        . '<div class="tg-input"><span class="ic"><i class="fa-solid ' . tg_h($icon) . '"></i></span>'
        . '<input id="' . tg_h($id) . '" placeholder="' . tg_h($label) . '" ' . $attrs . '></div>';
}

function tg_render_login($error, $return, $status = 401)
{
    $csrf = tg_csrf_token();
    $inner = '<h1>Area di test</h1>'
        . '<p class="tg-tagline"><span class="pp">&gt;</span>solo tester con un account dell\'admin<span class="tg-caret" aria-hidden="true"></span></p>'
        . ($error !== '' ? '<div class="err" role="alert">' . tg_h($error) . '</div>' : '')
        . '<form method="post" action="' . tg_h(tg_access_url()) . '">'
        . tg_hidden('action', 'login') . tg_hidden('csrf', $csrf) . tg_hidden('return', tg_safe_return($return))
        . '<div class="tg-fields">'
        . tg_field('tg-user', 'Nome utente', 'fa-user', 'type="text" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus')
        . tg_field('tg-pass', 'Password', 'fa-lock', 'type="password" name="password" autocomplete="current-password" required')
        . '</div><button type="submit" class="tg-submit"><i class="fa-solid fa-flask"></i>Entra</button></form>'
        . tg_foot();
    tg_page('Accesso', tg_hud($inner, 'area di test'), $status);
}

function tg_render_change(array $me, $forced, $error, $return)
{
    $csrf = tg_csrf_token();
    $intro = $forced
        ? '<p class="dim" style="text-align:center">Ciao <strong>' . tg_h($me['user']['name']) . '</strong>, sei entrato con una password temporanea: scegline una tua per continuare.</p>'
        : '<p class="dim" style="text-align:center">Nuova password per <strong>' . tg_h($me['user']['name']) . '</strong>.</p>';
    $inner = '<h1>Nuova password</h1>'
        . '<p class="tg-tagline"><span class="pp">&gt;</span>almeno ' . TG_MIN_PASSWORD . ' caratteri<span class="tg-caret" aria-hidden="true"></span></p>'
        . $intro
        . ($error !== '' ? '<div class="err" role="alert">' . tg_h($error) . '</div>' : '')
        . '<form method="post" action="' . tg_h(tg_access_url()) . '">'
        . tg_hidden('action', 'change') . tg_hidden('csrf', $csrf) . tg_hidden('return', tg_safe_return($return))
        . '<div class="tg-fields">'
        . ($forced ? '' : tg_field('tg-cur', 'Password attuale', 'fa-lock', 'type="password" name="current" autocomplete="current-password" required'))
        . tg_field('tg-new', 'Nuova password', 'fa-key', 'type="password" name="new" autocomplete="new-password" minlength="' . TG_MIN_PASSWORD . '" required autofocus')
        . tg_field('tg-conf', 'Ripeti la nuova password', 'fa-key', 'type="password" name="confirm" autocomplete="new-password" minlength="' . TG_MIN_PASSWORD . '" required')
        . '</div><button type="submit" class="tg-submit"><i class="fa-solid fa-floppy-disk"></i>Salva e continua</button></form>'
        . '<form method="post" action="' . tg_h(tg_access_url()) . '">' . tg_hidden('action', 'logout') . tg_hidden('csrf', $csrf)
        . '<button type="submit" class="tg-plain">Esci</button></form>'
        . tg_foot();
    tg_page('Nuova password', tg_hud($inner, 'area di test'), $forced ? 403 : 200);
}

function tg_render_unconfigured()
{
    tg_page('Non configurata', tg_hud('<h1>Area di test chiusa</h1>'
        . '<p class="tg-tagline"><span class="pp">&gt;</span>accesso non ancora configurato</p>'
        . '<p class="dim" style="text-align:center">L\'area di prova non è ancora aperta.</p>' . tg_foot(), 'area di test'), 503);
}

function tg_render_error()
{
    tg_page('Errore', tg_hud('<h1>Area di test non disponibile</h1>'
        . '<p class="tg-tagline"><span class="pp">&gt;</span>errore del server</p>'
        . '<p class="dim" style="text-align:center">Qualcosa non va sul server. Riprova fra poco.</p>' . tg_foot(), 'area di test'), 500);
}

// ── Cancello delle pagine ────────────────────────────────────

/**
 * Da chiamare in cima a index.php, arcade.php e music/index.php, prima di ogni output.
 * Fuori da /test/ non fa niente. Altrimenti, se non c'è un utente valido, mostra login,
 * cambio password o avviso e termina.
 */
function espo_test_gate()
{
    if (!tg_enabled()) return;
    try {
        $st = tg_store(function (array &$st) {
            tg_bootstrap($st);
            return $st;
        });
    } catch (Throwable $e) {
        error_log('[test-gate] ' . $e->getMessage());
        tg_render_error();
        exit;
    }
    if (tg_admins($st) === 0) {
        tg_render_unconfigured();
        exit;
    }
    $me = tg_current($st);
    $here = $_SERVER['REQUEST_URI'] ?? tg_base();
    if (!$me) {
        tg_render_login('', $here);
        exit;
    }
    if (!empty($me['user']['must_change'])) {
        tg_render_change($me, true, '', $here);
        exit;
    }
    // Le pagine non vanno in cache del browser: un accesso revocato deve valere al prossimo caricamento.
    header('Cache-Control: no-store');
    if (!defined('ESPO_TEST_GATE_USER')) define('ESPO_TEST_GATE_USER', $me['user']['name']);
}

/**
 * Tag dello script del login unico, da mettere in <head> prima degli script del gioco.
 * Fuori dall'area di test (o senza utente) non stampa niente. Lo script sta in php/ e
 * non nella pagina: il service worker mette in cache le pagine, mai quello che sta in php/,
 * e dentro c'è la password dell'account di gioco.
 */
function espo_test_gate_seed_tag()
{
    if (!defined('ESPO_TEST_GATE_USER')) return '';
    return '<script src="' . tg_h(tg_access_url('seed=1')) . '"></script>';
}
