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

function tg_valid_name($name)
{
    return is_string($name) && preg_match('/^[A-Za-z0-9][A-Za-z0-9_.-]{2,23}$/', $name) === 1;
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
        error_log('[test-gate] admin dei secret ignorato: il nome deve avere 3-24 caratteri fra lettere, numeri, . _ -');
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
    $user = $st['users'][$key] ?? array('name' => $cfg['user'], 'created' => time(), 'created_by' => 'deploy', 'ver' => 0);
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

function tg_login_cookie(array $st, $key)
{
    $exp = time() + TG_TTL;
    $payload = tg_b64(json_encode(array('u' => $key, 'v' => (int) $st['users'][$key]['ver'], 'e' => $exp)));
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
        . '<style>'
        . ':root{color-scheme:dark;--bg:#050a12;--card:#0b1624;--line:#1d3550;--text:#e6f1ff;--dim:#8aa4c0;--accent:#38bdf8;--danger:#f87171;--ok:#34d399}'
        . '*{box-sizing:border-box}body{margin:0;min-height:100vh;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;justify-content:center;padding:32px 16px}'
        . 'main{width:100%;max-width:440px}main.wide{max-width:820px}'
        . 'h1{font-size:1.35rem;margin:0 0 4px}p{margin:0 0 12px}.dim{color:var(--dim);font-size:.92rem}'
        . '.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px;margin:16px 0}'
        . 'label{display:block;font-size:.9rem;color:var(--dim);margin:12px 0 4px}'
        . 'input[type=text],input[type=password]{width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--line);background:#06101c;color:var(--text);font-size:1rem}'
        . 'button,.btn{display:inline-block;margin-top:16px;padding:10px 16px;border-radius:8px;border:1px solid var(--accent);background:var(--accent);color:#04121f;font-weight:600;font-size:.95rem;cursor:pointer;text-decoration:none}'
        . 'button.ghost,.btn.ghost{background:transparent;color:var(--accent)}button.danger{background:transparent;border-color:var(--danger);color:var(--danger)}'
        . 'button.small{margin:0;padding:5px 10px;font-size:.82rem}'
        . '.err{border-left:3px solid var(--danger);padding:8px 12px;background:#2a0f14;border-radius:6px;margin:12px 0}'
        . '.ok{border-left:3px solid var(--ok);padding:8px 12px;background:#0b2a20;border-radius:6px;margin:12px 0}'
        . 'code.secret{display:inline-block;font-size:1.15rem;letter-spacing:.06em;padding:6px 10px;background:#06101c;border:1px dashed var(--ok);border-radius:6px;user-select:all}'
        . 'table{width:100%;border-collapse:collapse;font-size:.92rem}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line);vertical-align:middle}th{color:var(--dim);font-weight:500}'
        . 'td.actions{display:flex;gap:6px;flex-wrap:wrap}td.actions form{margin:0}'
        . '.tag{font-size:.78rem;padding:2px 8px;border-radius:999px;border:1px solid var(--line);color:var(--dim);white-space:nowrap}.tag.warn{border-color:#f59e0b;color:#fbbf24}.tag.off{border-color:var(--danger);color:var(--danger)}'
        . '.bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.bar form{margin:0}.bar .btn,.bar button{margin-top:0}'
        . '@media (max-width:640px){th.hide,td.hide{display:none}}'
        . '</style></head><body>' . $body
        . '<script>try{if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(x){x.unregister();});});}'
        . 'if(window.caches&&caches.keys){caches.keys().then(function(k){k.forEach(function(n){caches.delete(n);});});}}catch(e){}</script>'
        . '</body></html>';
}

function tg_hidden($name, $value)
{
    return '<input type="hidden" name="' . tg_h($name) . '" value="' . tg_h($value) . '">';
}

function tg_render_login($error, $return, $status = 401)
{
    $csrf = tg_csrf_token();
    $body = '<main><h1>Area di test</h1>'
        . '<p class="dim">Questa è la versione di prova di Espòòò Clicker: si entra solo con un account creato dall\'admin. Il gioco vero è su <a href="/" style="color:var(--accent)">espooclicker.altervista.org</a>.</p>'
        . ($error !== '' ? '<div class="err" role="alert">' . tg_h($error) . '</div>' : '')
        . '<form class="card" method="post" action="' . tg_h(tg_access_url()) . '">'
        . tg_hidden('action', 'login') . tg_hidden('csrf', $csrf) . tg_hidden('return', tg_safe_return($return))
        . '<label for="tg-user">Nome utente</label><input id="tg-user" type="text" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus>'
        . '<label for="tg-pass">Password</label><input id="tg-pass" type="password" name="password" autocomplete="current-password" required>'
        . '<button type="submit">Entra</button></form></main>';
    tg_page('Accesso', $body, $status);
}

function tg_render_change(array $me, $forced, $error, $return)
{
    $csrf = tg_csrf_token();
    $intro = $forced
        ? '<p>Ciao <strong>' . tg_h($me['user']['name']) . '</strong>: sei entrato con una password temporanea. Scegline una tua per continuare.</p>'
        : '<p>Cambia la password di <strong>' . tg_h($me['user']['name']) . '</strong>.</p>';
    $body = '<main><h1>Nuova password</h1>' . $intro
        . ($error !== '' ? '<div class="err" role="alert">' . tg_h($error) . '</div>' : '')
        . '<form class="card" method="post" action="' . tg_h(tg_access_url()) . '">'
        . tg_hidden('action', 'change') . tg_hidden('csrf', $csrf) . tg_hidden('return', tg_safe_return($return))
        . ($forced ? '' : '<label for="tg-cur">Password attuale</label><input id="tg-cur" type="password" name="current" autocomplete="current-password" required>')
        . '<label for="tg-new">Nuova password (almeno ' . TG_MIN_PASSWORD . ' caratteri)</label><input id="tg-new" type="password" name="new" autocomplete="new-password" minlength="' . TG_MIN_PASSWORD . '" required autofocus>'
        . '<label for="tg-conf">Ripeti la nuova password</label><input id="tg-conf" type="password" name="confirm" autocomplete="new-password" minlength="' . TG_MIN_PASSWORD . '" required>'
        . '<button type="submit">Salva e continua</button></form>'
        . '<form method="post" action="' . tg_h(tg_access_url()) . '">' . tg_hidden('action', 'logout') . tg_hidden('csrf', $csrf)
        . '<button type="submit" class="ghost">Esci</button></form></main>';
    tg_page('Nuova password', $body, $forced ? 403 : 200);
}

function tg_render_unconfigured()
{
    tg_page('Non configurata', '<main><h1>Area di test chiusa</h1>'
        . '<p class="dim">L\'accesso all\'area di prova non è ancora configurato. Il gioco vero è su <a href="/" style="color:var(--accent)">espooclicker.altervista.org</a>.</p></main>', 503);
}

function tg_render_error()
{
    tg_page('Errore', '<main><h1>Area di test non disponibile</h1><p class="dim">Qualcosa non va sul server. Riprova fra poco.</p></main>', 500);
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
