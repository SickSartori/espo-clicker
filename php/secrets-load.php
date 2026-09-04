<?php
// ============================================================
// SECRETS — caricatore unico della configurazione server-side
// ============================================================
// I valori veri stanno in php/secrets.php, che è GITIGNORED: non esiste
// nel checkout (né clonando il repo, né in CI) e va caricato a mano su
// Altervista. Il template tracciato è php/secrets.example.php.
//
// Uso:
//     require_once __DIR__ . '/secrets-load.php';
//     if (!secrets_configured('r2')) { ...errore... }
//     $cfg = secrets('r2');
//
// Perché un file solo: prima la configurazione era spalmata su due file
// per sezione, ognuno col proprio controllo anti-placeholder copiato
// verbatim nei consumer (get_asset_urls.php e get_songs.php avevano lo
// stesso blocco di 4 righe) e con `allowed_referers` duplicata e già
// divergente fra i due template.
//
// RETROCOMPATIBILITÀ — non togliere alla leggera: se secrets.php non c'è,
// si ripiega sui due file storici (r2-config.php, trello-config.php).
// Serve perché quei file vivono SOLO sul server: senza fallback il primo
// deploy dopo il consolidamento spegnerebbe R2 (500 sul signer, quindi
// asset 404) fino al caricamento manuale del file nuovo. Il fallback si
// rimuove in una release successiva, una volta che il server è passato a
// secrets.php — vedi dev/docs/roadmap.md.
// ============================================================

/**
 * Vero se il valore è vuoto o è ancora il segnaposto del template.
 * Centralizzato qui apposta: prima ogni consumer si portava dietro la
 * propria copia della stessa condizione, e aggiungere una sezione
 * significava ricordarsi di replicarla.
 */
function secrets_is_placeholder($value)
{
    if (!is_string($value) || $value === '') {
        return true;
    }
    // Template R2/Trello: 'INSERISCI_..._QUI'
    if (strpos($value, 'INSERISCI_') === 0) {
        return true;
    }
    // Template endpoint/account: '<ACCOUNT_ID>'
    if (substr($value, 0, 1) === '<' && substr($value, -1) === '>') {
        return true;
    }
    return false;
}

/**
 * Restituisce la sezione richiesta ('r2' | 'trello'), [] se assente.
 *
 * `allowed_referers` può stare alla radice di secrets.php: viene iniettata
 * in ogni sezione che non ne dichiari una propria, così la whitelist si
 * scrive UNA volta sola invece di essere ricopiata per endpoint.
 */
function secrets($section)
{
    static $data = null;

    if ($data === null) {
        $data = [];
        $unified = __DIR__ . '/secrets.php';

        if (file_exists($unified)) {
            $loaded = require $unified;
            if (is_array($loaded)) {
                $data = $loaded;
            }
        } else {
            // Fallback storico: un file per sezione (vedi nota in testa)
            $legacy = array(
                'r2'     => __DIR__ . '/r2-config.php',
                'trello' => __DIR__ . '/trello-config.php',
            );
            foreach ($legacy as $name => $path) {
                if (file_exists($path)) {
                    $loaded = require $path;
                    if (is_array($loaded)) {
                        $data[$name] = $loaded;
                    }
                }
            }
        }
    }

    if (empty($data[$section]) || !is_array($data[$section])) {
        return array();
    }

    $cfg = $data[$section];
    if (!isset($cfg['allowed_referers']) && isset($data['allowed_referers'])) {
        $cfg['allowed_referers'] = $data['allowed_referers'];
    }

    return $cfg;
}

/**
 * Vero se la sezione esiste ED è compilata (nessun segnaposto residuo).
 * Distinguere i due casi resta utile in diagnosi: "manca il file" e
 * "il file c'è ma non l'hai compilato" hanno cause e rimedi diversi.
 */
function secrets_configured($section)
{
    $cfg = secrets($section);
    if (!$cfg) {
        return false;
    }

    $required = array(
        'r2'     => array('access_key', 'secret_key'),
        'trello' => array('key', 'token'),
    );

    if (!isset($required[$section])) {
        return true;
    }

    foreach ($required[$section] as $key) {
        if (secrets_is_placeholder(isset($cfg[$key]) ? $cfg[$key] : null)) {
            return false;
        }
    }

    return true;
}

/**
 * Anti-hotlink condiviso: vero se il Referer è in whitelist (o se la
 * whitelist è vuota, cioè il check è disattivato). Era ricopiato in
 * get_asset_urls.php e get_songs.php con esiti diversi in caso di
 * rifiuto, quindi qui si decide solo, e il chiamante sceglie la risposta.
 */
function secrets_referer_allowed(array $cfg)
{
    if (empty($cfg['allowed_referers'])) {
        return true;
    }

    $referer = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
    foreach ($cfg['allowed_referers'] as $allowed) {
        if (strpos($referer, $allowed) === 0) {
            return true;
        }
    }

    return false;
}
