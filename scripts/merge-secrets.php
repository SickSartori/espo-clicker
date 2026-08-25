<?php
// ============================================================
// MERGE SECRETS — genera php/secrets.php dai due file storici
// ============================================================
// Migrazione una-tantum verso il file unico. Uso, dalla root del repo:
//
//     php scripts/merge-secrets.php            (anteprima, non scrive)
//     php scripts/merge-secrets.php --write    (scrive php/secrets.php)
//
// Legge php/r2-config.php e php/trello-config.php e ne produce la versione
// unificata, deduplicando `allowed_referers` (i due file divergevano: quello
// Trello aveva la variante 'www.', quello R2 no — l'unione le tiene entrambe).
//
// NON stampa mai i valori segreti: l'anteprima mostra solo quali chiavi sono
// state trovate e se risultano compilate.
//
// Il file prodotto è gitignored e NON viene deployato: va caricato a mano su
// Altervista via FTP. Finché lì ci sono ancora i due file storici, il sito
// continua a funzionare comunque (fallback in php/secrets-load.php).
// ============================================================

$root   = dirname(__DIR__);
$write  = in_array('--write', $argv, true);
$out    = $root . '/php/secrets.php';

$sources = array(
    'r2'     => $root . '/php/r2-config.php',
    'trello' => $root . '/php/trello-config.php',
);

require_once $root . '/php/secrets-load.php';

$sections  = array();
$referers  = array();

foreach ($sources as $name => $path) {
    if (!file_exists($path)) {
        fwrite(STDERR, "[!] $path non trovato: sezione '$name' saltata.\n");
        continue;
    }
    $cfg = require $path;
    if (!is_array($cfg)) {
        fwrite(STDERR, "[!] $path non restituisce un array: sezione '$name' saltata.\n");
        continue;
    }

    // allowed_referers sale alla radice: unione delle due liste, ordine
    // preservato, senza duplicati.
    if (!empty($cfg['allowed_referers']) && is_array($cfg['allowed_referers'])) {
        foreach ($cfg['allowed_referers'] as $r) {
            if (!in_array($r, $referers, true)) {
                $referers[] = $r;
            }
        }
        unset($cfg['allowed_referers']);
    }

    $sections[$name] = $cfg;
}

if (!$sections) {
    fwrite(STDERR, "Nessuna sezione da unire: niente da fare.\n");
    exit(1);
}

// ── Anteprima, senza valori ────────────────────────────────────────────
echo "Sezioni trovate:\n";
foreach ($sections as $name => $cfg) {
    echo "  $name: " . count($cfg) . " chiavi (" . implode(', ', array_keys($cfg)) . ")\n";
}
echo "allowed_referers unificati: " . count($referers) . "\n";
foreach ($referers as $r) {
    echo "  - $r\n";
}

$data = array_merge(array('allowed_referers' => $referers), $sections);

if (!$write) {
    echo "\nAnteprima soltanto. Rilancia con --write per scrivere php/secrets.php\n";
    exit(0);
}

if (file_exists($out)) {
    fwrite(STDERR, "\n[!] $out esiste già: non lo sovrascrivo. Rimuovilo a mano se vuoi rigenerarlo.\n");
    exit(1);
}

$php = "<?php\n"
     . "// GENERATO DA scripts/merge-secrets.php — file unico dei secret server-side.\n"
     . "// Gitignored: non è nel repo e la CI non lo deploya. Caricalo a mano su Altervista.\n"
     . "// Struttura e significato dei campi: vedi php/secrets.example.php\n\n"
     . "return " . var_export($data, true) . ";\n";

file_put_contents($out, $php);
echo "\nScritto $out\n";

// Rilettura di controllo: meglio accorgersene qui che in produzione.
$check = require $out;
$okR2  = isset($check['r2']) && !secrets_is_placeholder($check['r2']['access_key'] ?? null);
$okTr  = isset($check['trello']) && !secrets_is_placeholder($check['trello']['token'] ?? null);
echo "Verifica: r2 compilato=" . ($okR2 ? 'si' : 'NO') . ", trello compilato=" . ($okTr ? 'si' : 'NO') . "\n";
