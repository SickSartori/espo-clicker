<?php
require_once __DIR__ . '/api_bootstrap.php';
require_once __DIR__ . '/security_config.php';

// Disable error reporting to screen
error_reporting(0);
ini_set('display_errors', 0);

$data = getJsonInput();
$user = authenticate($conn, $data['username'], $data['password']);

if (!isset($data['saveData'])) {
    echo json_encode(["status" => "error", "message" => "No data provided."]);
    exit;
}

// --- Dati in Arrivo ---
$rawScore = isset($data['score']) ? (string)$data['score'] : "0";
$rawPrestige = isset($data['prestige']) ? (string)$data['prestige'] : "0";

// Cleanup base
if (!preg_match('/^[0-9\.eE\+\-]+$/', $rawScore)) { $rawScore = "0"; }

// Hash check (Mantieni la tua logica di sicurezza esistente qui)
$clientHash = isset($data['hash']) ? $data['hash'] : '';
$dataString = $rawScore . '-' . $rawPrestige . '-' . GAME_SECRET_KEY;
$serverHash = hash(HASH_ALGO, $dataString);

if (!hash_equals($serverHash, $clientHash)) {
    // ... Log errore hash ...
    echo json_encode(["status" => "warning", "message" => "Save rejected: Integrity check failed."]);
    exit;
}

// --- NUOVO: CONTROLLO ANTI-ROLLBACK ---
// Recuperiamo il punteggio attuale dal DB per confrontarlo
$stmtCheck = $conn->prepare("SELECT score FROM $table_leaderboard WHERE username = ?");
$stmtCheck->bind_param("s", $user['username']);
$stmtCheck->execute();
$resCheck = $stmtCheck->get_result();
$currentDbScore = "0";
if ($row = $resCheck->fetch_assoc()) {
    $currentDbScore = $row['score'];
}
$stmtCheck->close();

// Funzione per confrontare numeri molto grandi (stringhe)
function isNewScoreHigher($new, $old) {
    // Rimuovi eventuali notazioni scientifiche se presenti o gestiscile, 
    // ma assumendo numeri interi salvati come stringhe:
    if (strlen($new) > strlen($old)) return true;
    if (strlen($new) < strlen($old)) return false;
    return strcmp($new, $old) >= 0;
}

// SE il nuovo punteggio è INFERIORE a quello nel DB, RIFIUTIAMO il salvataggio
// Nota: Questo non impedisce i reset manuali fatti tramite reset_progress.php,
// protegge solo i salvataggi automatici accidentali.
if (!isNewScoreHigher($rawScore, $currentDbScore)) {
    echo json_encode([
        "status" => "conflict", 
        "message" => "Cloud save is newer. Please reload."
    ]);
    exit;
}

// --- SE IL CONTROLLO PASSA, SALVA TUTTO ---

// 1. Aggiorna JSON Utente
$saveJson = json_encode($data['saveData']);
$stmt = $conn->prepare("UPDATE $table_users SET save_data = ? WHERE id = ?");
$stmt->bind_param("si", $saveJson, $user['id']);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database save failed."]);
    exit;
}

// 2. Aggiorna Leaderboard
$stmtLb = $conn->prepare("
    INSERT INTO $table_leaderboard (username, score, prestigeLevel, timestamp) 
    VALUES (?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE 
        score = VALUES(score), 
        prestigeLevel = VALUES(prestigeLevel),
        timestamp = NOW()
");
$stmtLb->bind_param("sss", $user['username'], $rawScore, $rawPrestige);
$stmtLb->execute();

echo json_encode(["status" => "success", "message" => "Saved and Verified"]);
$conn->close();
?>