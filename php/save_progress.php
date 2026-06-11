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
$rawEquippedSkin = isset($data['equippedSkin']) ? (string)$data['equippedSkin'] : 'default';
$rawFormattazioni = isset($data['totalFormattazioni']) ? (int)$data['totalFormattazioni'] : 0;
$prestigeInt = (int)$rawPrestige; // versione intera per il DB (difesa XSS: prestigeLevel sempre numerico)

// Cleanup base
if (!preg_match('/^[0-9\.eE\+\-]+$/', $rawScore)) { $rawScore = "0"; }

// Valida token (24h expiry) — esce con 401 se scaduto
$sessionToken = validateToken();

// Hash check dinamico
$clientHash = isset($data['hash']) ? $data['hash'] : '';
$dataString = $rawScore . '-' . $rawPrestige . '-' . $sessionToken;
$serverHash = hash(HASH_ALGO, $dataString);

if (!hash_equals($serverHash, $clientHash)) {
    echo json_encode(["status" => "warning", "message" => "Save rejected: Integrity check failed."]);
    exit;
}

// --- CONTROLLO ANTI-ROLLBACK ---
$stmtCheck = $conn->prepare("SELECT score, totalFormattazioni, prestigeLevel FROM $table_leaderboard WHERE username = ?");
$stmtCheck->bind_param("s", $user['username']);
$stmtCheck->execute();
$resCheck = $stmtCheck->get_result();

$currentDbScore = "0";
$currentDbFormat = 0;
$currentDbPrestige = 0;

if ($row = $resCheck->fetch_assoc()) {
    $currentDbScore = $row['score'];
    $currentDbFormat = (int)$row['totalFormattazioni'];
    $currentDbPrestige = (int)$row['prestigeLevel'];
}
$stmtCheck->close();

function isNewScoreHigher($new, $old) {
    $new = strtolower(trim($new));
    $old = strtolower(trim($old));
    if (strpos($new, 'e') !== false || strpos($old, 'e') !== false) {
        return (float)$new >= (float)$old;
    }
    if (strlen($new) > strlen($old)) return true;
    if (strlen($new) < strlen($old)) return false;
    return strcmp($new, $old) >= 0;
}

// LOGICA V3: Formattazioni > Prestige > Score (gerarchia completa anti-race)
if ($rawFormattazioni < $currentDbFormat) {
    // Salvataggio vecchio pre-formattazione
    echo json_encode(["status" => "conflict", "message" => "Cloud save is newer (Format). Please reload."]);
    exit;
} else if ($rawFormattazioni == $currentDbFormat) {
    if ((int)$rawPrestige < $currentDbPrestige) {
        // Auto-save stale arrivato dopo un prestige (race condition)
        echo json_encode(["status" => "conflict", "message" => "Cloud save is newer (Prestige). Please reload."]);
        exit;
    } else if ((int)$rawPrestige == $currentDbPrestige && !isNewScoreHigher($rawScore, $currentDbScore)) {
        // Stessa run, ma score più basso (Rollback classico)
        echo json_encode(["status" => "conflict", "message" => "Cloud save is newer (Score). Please reload."]);
        exit;
    }
}

// --- SE IL CONTROLLO PASSA, SALVA TUTTO ---
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
    INSERT INTO $table_leaderboard (username, score, prestigeLevel, equippedSkin, totalFormattazioni, timestamp) 
    VALUES (?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE 
        score = VALUES(score), 
        prestigeLevel = VALUES(prestigeLevel),
        equippedSkin = VALUES(equippedSkin),
        totalFormattazioni = VALUES(totalFormattazioni),
        timestamp = NOW()
");
$stmtLb->bind_param("ssisi", $user['username'], $rawScore, $prestigeInt, $rawEquippedSkin, $rawFormattazioni);
$stmtLb->execute();

echo json_encode(["status" => "success", "message" => "Saved and Verified"]);
$conn->close();
?>