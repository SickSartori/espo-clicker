<?php
/**
 * Area di test: login, uscita, cambio password e pannello admin (issue #40).
 * La logica sta in php/test-gate.php; fuori da /test/ questa pagina non esiste (404).
 *
 * L'admin crea i tester e ne reimposta la password: la password temporanea si vede
 * UNA volta, nella risposta all'azione, e non viene salvata da nessuna parte in chiaro.
 * Per questo le azioni rispondono direttamente invece di reindirizzare.
 */
require_once __DIR__ . '/test-gate.php';

if (!tg_enabled()) {
    http_response_code(404);
    exit;
}

try {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
        tga_post();
    } else {
        tga_get();
    }
} catch (Throwable $e) {
    error_log('[test-access] ' . $e->getMessage());
    tg_render_error();
}

function tga_redirect($to)
{
    header('Cache-Control: no-store');
    header('Location: ' . $to, true, 303);
    exit;
}

function tga_forbidden()
{
    tg_page('Non permesso', '<main><h1>Non permesso</h1><p class="dim">Questa azione è riservata all\'admin.</p>'
        . '<a class="btn ghost" href="' . tg_h(tg_access_url()) . '">Indietro</a></main>', 403);
    exit;
}

function tga_get()
{
    $st = tg_store(function (array &$st) {
        tg_bootstrap($st);
        return $st;
    });
    if (tg_admins($st) === 0) {
        tg_render_unconfigured();
        return;
    }
    $me = tg_current($st);
    if (isset($_GET['seed'])) {
        tga_seed($st, $me);
        return;
    }
    if (!$me) {
        tg_render_login('', tg_access_url());
        return;
    }
    if (!empty($me['user']['must_change'])) {
        tg_render_change($me, true, '', tg_base());
        return;
    }
    if (isset($_GET['cambia'])) {
        tg_render_change($me, false, '', tg_access_url());
        return;
    }
    tga_render_panel($st, $me, '', '');
}

/**
 * Script del login unico, incluso in testa a index.php e arcade.php (espo_test_gate_seed_tag).
 * Passa al gioco nome e password dell'account di gioco del tester, che login-register crea da
 * solo al primo accesso, e aggiunge al profilo la sezione «Area di test». Senza utente valido
 * non manda niente (204). Mai in cache: contiene la password dell'account di gioco.
 */
function tga_seed(array $st, $me)
{
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    // Solo dalla stessa origine. Un <script> su un altro sito non porta il cookie (SameSite=Lax),
    // ma un altro sottodominio di altervista.org conterebbe come «stesso sito» e lo porterebbe:
    // senza questo controllo leggerebbe la password dell'account di gioco. I browser che non
    // mandano Sec-Fetch-Site restano coperti dal solo SameSite.
    $site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
    if ($site !== '' && $site !== 'same-origin') {
        http_response_code(403);
        return;
    }
    if (!$me || !empty($me['user']['must_change'])) {
        http_response_code(204);
        return;
    }
    $name = $me['user']['name'];
    $gate = array(
        'user'   => $name,
        'admin'  => ($me['user']['role'] ?? '') === 'admin',
        'panel'  => tg_access_url(),
        'change' => tg_access_url('cambia=1'),
        'logout' => array('url' => tg_access_url(), 'csrf' => tg_csrf_token()),
    );
    $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP;
    header('Content-Type: application/javascript; charset=UTF-8');
    echo strtr(tga_seed_js(), array(
        '__GATE__'     => json_encode($gate, $flags),
        '__PASSWORD__' => json_encode(tg_game_password($st, $name), $flags),
    ));
}

// Funzione e non costante: le funzioni esistono da subito, una const in fondo al file no.
function tga_seed_js()
{
    return <<<'JS'
/* Area di test: login unico e sezione «Area di test» nel profilo (php/test-access.php). */
(function () {
  var G = __GATE__;
  var P = __PASSWORD__;
  window.ESPO_TEST_GATE = G;
  var seeded = false;
  try {
    // Se in questa scheda il login automatico è già fallito (il nome esiste nel gioco di test con
    // un'altra password), non si risemina: il giocatore entra a mano, una volta.
    if (sessionStorage.getItem('espoTestGateFailed') !== G.user && sessionStorage.getItem('espooUser') !== G.user) {
      sessionStorage.setItem('espooUser', G.user);
      sessionStorage.setItem('espooPass', P);
    }
    seeded = sessionStorage.getItem('espooUser') === G.user && sessionStorage.getItem('espooPass') === P;
  } catch (e) {}

  var style = document.createElement('style');
  style.textContent = '.espo-test-gate-who{margin:4px 0 10px}'
    + '.espo-test-gate-actions{display:flex;flex-direction:column;gap:8px}'
    + '.espo-test-gate-actions a{display:block;text-align:center;text-decoration:none}'
    + '.espo-test-gate-note{font-size:.85em;opacity:.7;margin:10px 0 0}';
  (document.head || document.documentElement).appendChild(style);

  function link(href, text, icon) {
    var a = document.createElement('a');
    a.href = href;
    a.className = 'buy-btn ghost-btn full-width';
    a.innerHTML = '<i class="fa-solid ' + icon + '"></i> ';
    a.appendChild(document.createTextNode(text));
    return a;
  }

  function setup() {
    var pane = document.querySelector('[data-hubpane="account"]');
    if (!pane || pane.querySelector('.espo-test-gate')) return;
    // Nome e password dell'account di gioco li decide l'area di test: cambiarli dal gioco
    // romperebbe il collegamento, ed eliminarlo lo ricreerebbe vuoto al prossimo accesso.
    ['change-username-btn', 'change-password-btn'].forEach(function (id) {
      var el = document.getElementById(id);
      var section = el && el.closest('.form-section');
      if (section) section.style.display = 'none';
    });
    var divider = pane.querySelector('.profile-divider');
    if (divider) divider.style.display = 'none';
    var del = document.getElementById('delete-save-btn');
    if (del) del.style.display = 'none';
    // Il reset dei progressi chiede la password del gioco, che il tester non conosce: la si mette qui.
    if (seeded) {
      var dz = document.getElementById('danger-zone-password');
      if (dz) {
        dz.value = P;
        var wrap = dz.closest('.input-group-modern');
        if (wrap) wrap.style.display = 'none';
      }
    }
    var box = document.createElement('div');
    box.className = 'form-section espo-test-gate';
    box.innerHTML = '<label class="section-label">Area di test</label><p class="espo-test-gate-who"></p>'
      + '<div class="espo-test-gate-actions"></div><p class="espo-test-gate-note"></p>';
    box.querySelector('.espo-test-gate-who').textContent = 'Sei entrato come ' + G.user + (G.admin ? ' (admin).' : '.');
    box.querySelector('.espo-test-gate-note').textContent = 'Nome e password si cambiano da qui. «Esci» chiude anche l\'area di test.';
    var actions = box.querySelector('.espo-test-gate-actions');
    if (G.admin) actions.appendChild(link(G.panel, 'Gestisci tester', 'fa-users-gear'));
    actions.appendChild(link(G.change, 'Cambia password', 'fa-key'));
    var logout = document.getElementById('logout-btn');
    if (logout && logout.parentNode === pane) logout.insertAdjacentElement('afterend', box);
    else pane.insertBefore(box, pane.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
JS;
}

function tga_post()
{
    $action = (string) ($_POST['action'] ?? '');
    if (!tg_csrf_ok()) {
        // Pagina scaduta o form arrivato da fuori: si riparte dal form, con un token nuovo.
        tg_render_login('La pagina era scaduta: riprova.', (string) ($_POST['return'] ?? tg_base()), 400);
        return;
    }
    if ($action === 'login') {
        tga_login();
        return;
    }
    if ($action === 'logout') {
        tg_logout_cookie();
        tga_redirect(tg_base());
    }

    // Da qui serve un utente valido.
    $st = tg_store(function (array &$st) { return $st; });
    $me = tg_current($st);
    if (!$me) {
        tg_render_login('Sessione scaduta: entra di nuovo.', tg_access_url());
        return;
    }
    if ($action === 'change') {
        tga_change($me);
        return;
    }
    if (($me['user']['role'] ?? '') !== 'admin') {
        tga_forbidden();
    }
    if (!empty($me['user']['must_change'])) {
        tg_render_change($me, true, '', tg_base());
        return;
    }
    tga_admin_action($action, $me);
}

function tga_login()
{
    $name = trim((string) ($_POST['username'] ?? ''));
    $pass = (string) ($_POST['password'] ?? '');
    $return = (string) ($_POST['return'] ?? tg_base());

    $res = tg_store(function (array &$st) use ($name, $pass) {
        tg_bootstrap($st);
        tg_prune_fails($st);
        $tag = tg_client_tag($st, $name);
        $wait = tg_locked_for($st, $tag);
        if ($wait > 0) {
            return array('wait' => $wait);
        }
        $key = strtolower($name);
        $user = $st['users'][$key] ?? null;
        // Stesso messaggio per nome sbagliato, password sbagliata e account disattivato.
        if (!$user || !empty($user['disabled']) || !password_verify($pass, $user['hash'])) {
            $st['fails'][$tag][] = time();
            return array('error' => true);
        }
        unset($st['fails'][$tag]);
        if (password_needs_rehash($user['hash'], PASSWORD_DEFAULT)) {
            $st['users'][$key]['hash'] = password_hash($pass, PASSWORD_DEFAULT);
        }
        return array('key' => $key, 'st' => $st);
    });

    if (isset($res['wait'])) {
        tg_render_login('Troppi tentativi sbagliati: riprova fra ' . max(1, (int) ceil($res['wait'] / 60)) . ' minuti.', $return, 429);
        return;
    }
    if (isset($res['error'])) {
        tg_render_login('Nome utente o password sbagliati.', $return);
        return;
    }
    tg_login_cookie($res['st'], $res['key']);
    tga_redirect(tg_safe_return($return));
}

function tga_change(array $me)
{
    $forced = !empty($me['user']['must_change']);
    $return = (string) ($_POST['return'] ?? tg_base());
    $res = tg_store(function (array &$st) use ($me, $forced) {
        $key = $me['key'];
        $user = $st['users'][$key] ?? null;
        if (!$user) return array('error' => 'Account non trovato.');
        if (!$forced && !password_verify((string) ($_POST['current'] ?? ''), $user['hash'])) {
            return array('error' => 'La password attuale non è giusta.');
        }
        $new = (string) ($_POST['new'] ?? '');
        $problem = tg_password_problem($new, (string) ($_POST['confirm'] ?? ''), $user['hash']);
        if ($problem) return array('error' => $problem);
        $st['users'][$key]['hash'] = password_hash($new, PASSWORD_DEFAULT);
        $st['users'][$key]['must_change'] = false;
        $st['users'][$key]['ver'] = (int) $user['ver'] + 1;   // gli altri dispositivi devono rientrare
        return array('st' => $st);
    });
    if (isset($res['error'])) {
        tg_render_change($me, $forced, $res['error'], $return);
        return;
    }
    tg_login_cookie($res['st'], $me['key']);
    tga_redirect(tg_safe_return($return));
}

function tga_admin_action($action, array $me)
{
    $target = strtolower(trim((string) ($_POST['username'] ?? '')));
    $res = tg_store(function (array &$st) use ($action, $target, $me) {
        $exists = isset($st['users'][$target]);
        switch ($action) {
            case 'create':
                $name = trim((string) ($_POST['username'] ?? ''));
                if (!tg_valid_name($name)) return array('error' => 'Nome non valido: da 3 a 20 caratteri fra lettere, numeri, punto, trattino e trattino basso. È anche il nome nel gioco.');
                if ($exists) return array('error' => 'Esiste già un utente «' . $name . '».');
                $temp = tg_temp_password();
                $st['users'][$target] = array(
                    'name' => $name, 'role' => 'tester', 'hash' => password_hash($temp, PASSWORD_DEFAULT),
                    'must_change' => true, 'disabled' => false, 'ver' => 1,
                    'created' => time(), 'created_by' => $me['user']['name'],
                );
                return array('temp' => $temp, 'for' => $name, 'msg' => 'Creato «' . $name . '».');
            case 'reset':
                if (!$exists) return array('error' => 'Utente non trovato.');
                if ($target === $me['key']) return array('error' => 'La tua password la cambi da «Cambia la mia password».');
                $temp = tg_temp_password();
                $st['users'][$target]['hash'] = password_hash($temp, PASSWORD_DEFAULT);
                $st['users'][$target]['must_change'] = true;
                $st['users'][$target]['ver'] = (int) $st['users'][$target]['ver'] + 1;
                return array('temp' => $temp, 'for' => $st['users'][$target]['name'], 'msg' => 'Password reimpostata: le sessioni aperte sono chiuse.');
            case 'disable':
            case 'enable':
                if (!$exists) return array('error' => 'Utente non trovato.');
                if ($target === $me['key']) return array('error' => 'Non puoi disattivare te stesso.');
                $off = $action === 'disable';
                if ($off && ($st['users'][$target]['role'] ?? '') === 'admin' && tg_admins($st) <= 1) return array('error' => 'Serve almeno un admin attivo.');
                $st['users'][$target]['disabled'] = $off;
                $st['users'][$target]['ver'] = (int) $st['users'][$target]['ver'] + 1;
                return array('msg' => ($off ? 'Disattivato' : 'Riattivato') . ' «' . $st['users'][$target]['name'] . '».');
            case 'delete':
                if (!$exists) return array('error' => 'Utente non trovato.');
                if ($target === $me['key']) return array('error' => 'Non puoi eliminare te stesso.');
                if (($st['users'][$target]['role'] ?? '') === 'admin' && empty($st['users'][$target]['disabled']) && tg_admins($st) <= 1) return array('error' => 'Serve almeno un admin attivo.');
                $name = $st['users'][$target]['name'];
                unset($st['users'][$target]);
                return array('msg' => 'Eliminato «' . $name . '».');
        }
        return array('error' => 'Azione sconosciuta.');
    });
    $st = tg_store(function (array &$st) { return $st; });
    $flash = '';
    if (isset($res['temp'])) {
        $flash = '<div class="ok" role="status"><p>' . tg_h($res['msg']) . ' Password temporanea di <strong>' . tg_h($res['for']) . '</strong>:</p>'
            . '<p><code class="secret">' . tg_h($res['temp']) . '</code></p>'
            . '<p class="dim">Si vede solo adesso: copiala e passala al tester. Al primo accesso dovrà sceglierne una sua.</p></div>';
    } elseif (isset($res['msg'])) {
        $flash = '<div class="ok" role="status">' . tg_h($res['msg']) . '</div>';
    }
    tga_render_panel($st, tg_current($st) ?: $me, $flash, $res['error'] ?? '');
}

function tga_render_panel(array $st, array $me, $flash, $error)
{
    $csrf = tg_csrf_token();
    $isAdmin = ($me['user']['role'] ?? '') === 'admin';
    $form = function ($action, $label, $class, $user = null, $confirm = '') use ($csrf) {
        return '<form method="post" action="' . tg_h(tg_access_url()) . '"'
            . ($confirm !== '' ? ' onsubmit="return confirm(' . tg_h(json_encode($confirm)) . ')"' : '') . '>'
            . tg_hidden('action', $action) . tg_hidden('csrf', $csrf) . ($user !== null ? tg_hidden('username', $user) : '')
            . '<button type="submit" class="' . $class . '">' . tg_h($label) . '</button></form>';
    };

    $body = '<main class="wide"><h1>Area di test</h1>'
        . '<p class="dim">Sei dentro come <strong>' . tg_h($me['user']['name']) . '</strong>' . ($isAdmin ? ' (admin)' : '') . '.</p>'
        . '<div class="bar"><a class="btn" href="' . tg_h(tg_base()) . '">Vai al gioco</a>'
        . '<a class="btn ghost" href="' . tg_h(tg_access_url('cambia=1')) . '">Cambia la mia password</a>'
        . $form('logout', 'Esci', 'ghost') . '</div>'
        . ($error !== '' ? '<div class="err" role="alert">' . tg_h($error) . '</div>' : '') . $flash;

    if ($isAdmin) {
        $body .= '<section class="card"><h2 style="font-size:1.05rem;margin:0 0 4px">Nuovo tester</h2>'
            . '<p class="dim">Ricevi una password temporanea da passargli: al primo accesso la cambia.</p>'
            . '<p class="dim">Il nome è anche quello nel gioco di test. Per fargli ritrovare i progressi di un account che ha già, scrivilo identico, maiuscole comprese; altrimenti usa un nome nuovo.</p>'
            . '<form method="post" action="' . tg_h(tg_access_url()) . '">' . tg_hidden('action', 'create') . tg_hidden('csrf', $csrf)
            . '<label for="tg-newuser">Nome utente</label><input id="tg-newuser" type="text" name="username" autocapitalize="none" spellcheck="false" maxlength="20" required>'
            . '<button type="submit">Crea tester</button></form></section>';

        $rows = '';
        $users = $st['users'];
        uasort($users, function ($a, $b) { return strcasecmp($a['name'], $b['name']); });
        foreach ($users as $key => $u) {
            $state = !empty($u['disabled']) ? '<span class="tag off">disattivato</span>'
                : (!empty($u['must_change']) ? '<span class="tag warn">primo accesso</span>' : '<span class="tag">attivo</span>');
            $actions = '';
            if ($key !== $me['key']) {
                $actions = $form('reset', 'Reimposta password', 'small ghost', $key, 'Reimpostare la password di ' . $u['name'] . '? Le sue sessioni aperte si chiudono.')
                    . (!empty($u['disabled']) ? $form('enable', 'Riattiva', 'small ghost', $key) : $form('disable', 'Disattiva', 'small ghost', $key))
                    . $form('delete', 'Elimina', 'small danger', $key, 'Eliminare ' . $u['name'] . '?');
            } else {
                $actions = '<span class="dim">sei tu</span>';
            }
            $rows .= '<tr><td><strong>' . tg_h($u['name']) . '</strong></td><td>' . tg_h($u['role'] === 'admin' ? 'admin' : 'tester') . '</td><td>' . $state . '</td>'
                . '<td class="hide dim">' . tg_h(date('d/m/Y', (int) ($u['created'] ?? 0))) . '</td><td class="actions">' . $actions . '</td></tr>';
        }
        $body .= '<section class="card"><h2 style="font-size:1.05rem;margin:0 0 8px">Utenti (' . count($users) . ')</h2>'
            . '<table><thead><tr><th>Nome</th><th>Ruolo</th><th>Stato</th><th class="hide">Creato</th><th>Azioni</th></tr></thead><tbody>' . $rows . '</tbody></table></section>';
    }
    $body .= '</main>';
    tg_page('Area di test', $body, 200);
}
