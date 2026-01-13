<?php
require_once 'api_bootstrap.php';
require_once 'security_config.php';

// Disabilita report errori a schermo per non rompere il JSON
error_reporting(0);
ini_set('display_errors', 0);

$data = getJsonInput();
$user = authenticate($conn, $data['username'], $data['password']);

if (!isset($data['saveData'])) {
    echo json_encode(["status" => "error", "message" => "Nessun dato."]);
    exit;
}

// --- VALIDAZIONE SICUREZZA ---
$rawScore = isset($data['score']) ? (string)$data['score'] : "0";
$rawPrestige = isset($data['prestige']) ? (string)$data['prestige'] : "0";

// Pulizia base: ci assicuriamo che contengano solo caratteri validi per un numero (cifre, punti, e, +, -)
// Questo permette di accettare sia "100000" che "1.52e+30"
if (!preg_match('/^[0-9\.eE\+\-]+$/', $rawScore)) { 
    $rawScore = "0"; 
}
if (!preg_match('/^[0-9\.eE\+\-]+$/', $rawPrestige)) { 
    $rawPrestige = "0"; 
}

$clientHash = isset($data['hash']) ? $data['hash'] : '';
$dataString = $rawScore . '-' . $rawPrestige . '-' . GAME_SECRET_KEY;
$serverHash = hash(HASH_ALGO, $dataString);

if (!hash_equals($serverHash, $clientHash)) {
    error_log("Security Mismatch. User: {$user['username']} | Server: $serverHash vs Client: $clientHash | Data: $dataString");
    echo json_encode(["status" => "warning", "message" => "Salvataggio rifiutato: Integrità dati fallita."]);
    exit;
}

// 1. Salvataggio Cloud (JSON Completo)
$saveJson = json_encode($data['saveData']);
$stmt = $conn->prepare("UPDATE $table_users SET save_data = ? WHERE id = ?");
$stmt->bind_param("si", $saveJson, $user['id']);
$stmt->execute();

// 2. Aggiornamento Classifica
// Nota: Se il database ha colonne DECIMAL, i numeri scientifici (es. 1e+30) potrebbero essere troncati 
// finché non aggiorneremo anche la struttura del DB nel prossimo passo.
$allowUpdate = true; 

if ($allowUpdate) {
    $stmtLb = $conn->prepare("
        INSERT INTO $table_leaderboard (username, score, prestigeLevel, timestamp) 
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
            score = GREATEST(score, ?), 
            prestigeLevel = GREATEST(prestigeLevel, ?),
            timestamp = NOW()
    ");
    
    // Usiamo le stringhe raw. MySQL gestirà la conversione finché i numeri non superano la capacità del campo DECIMAL.
    $stmtLb->bind_param("sssss", $user['username'], $rawScore, $rawPrestige, $rawScore, $rawPrestige);
    
    if (!$stmtLb->execute()) {
        error_log("Leaderboard Error: " . $stmtLb->error);
    }
}

echo json_encode(["status" => "success", "message" => "Salvato e Verificato"]);
$conn->close();
?>