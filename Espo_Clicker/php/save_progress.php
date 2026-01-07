<?php
require_once 'api_bootstrap.php';
require_once 'security_config.php';

$data = getJsonInput();
$user = authenticate($conn, $data['username'], $data['password']);

if (!isset($data['saveData'])) {
    echo json_encode(["status" => "error", "message" => "Nessun dato."]);
    exit;
}

// --- VALIDAZIONE SICUREZZA ---
$rawScore = isset($data['score']) ? $data['score'] : 0;
$rawPrestige = isset($data['prestige']) ? $data['prestige'] : 0;


$cleanScore = number_format((float)$rawScore, 0, '', '');
$cleanPrestige = number_format((float)$rawPrestige, 0, '', '');

$clientHash = isset($data['hash']) ? $data['hash'] : '';

// Ricostruzione firma
$dataString = $cleanScore . '-' . $cleanPrestige . '-' . GAME_SECRET_KEY;
$serverHash = hash(HASH_ALGO, $dataString);

if (!hash_equals($serverHash, $clientHash)) {
    // DEBUG: Se fallisce, vediamo cosa vedeva il server.
    error_log("Security Mismatch. Server: $serverHash vs Client: $clientHash. String: $dataString");
    
    echo json_encode([
        "status" => "warning", 
        "message" => "Salvataggio rifiutato: Integrità dati fallita.",
        "debug_info" => [
            "server_string" => $dataString,
            "received_score" => $rawScore,
            "clean_score" => $cleanScore
        ]
    ]);
    exit;
}

// 1. Se l'hash è valido, procedi al salvataggio Cloud
$saveJson = json_encode($data['saveData']);
$stmt = $conn->prepare("UPDATE $table_users SET save_data = ? WHERE id = ?");
$stmt->bind_param("si", $saveJson, $user['id']);
$stmt->execute();

// 2. Aggiornamento Classifica BLINDATO
$dbScore = $cleanScore; // MySQL gestirà la conversione in BIGINT
$dbPrestige = $cleanPrestige;

$checkStmt = $conn->prepare("SELECT timestamp FROM $table_leaderboard WHERE username = ?");
$checkStmt->bind_param("s", $user['username']);
$checkStmt->execute();
$result = $checkStmt->get_result();
$oldEntry = $result->fetch_assoc();

$allowUpdate = true;

if ($oldEntry) {
    $lastUpdate = strtotime($oldEntry['timestamp']);
    $timeDiff = time() - $lastUpdate;

    // RATE LIMIT: Minimo 10 secondi tra aggiornamenti classifica
    if ($timeDiff < 10) {
        $allowUpdate = false; 
    }
}

if ($allowUpdate) {
    $stmtLb = $conn->prepare("
        INSERT INTO $table_leaderboard (username, score, prestigeLevel, timestamp) 
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
            score = GREATEST(score, VALUES(score)), 
            prestigeLevel = GREATEST(prestigeLevel, VALUES(prestigeLevel)),
            timestamp = NOW()
    ");
    // "sii" -> string, integer, integer (Anche se sono stringhe numeriche, bind_param le gestisce)
    $stmtLb->bind_param("sii", $user['username'], $dbScore, $dbPrestige);
    $stmtLb->execute();
}

echo json_encode(["status" => "success", "message" => "Salvato e Verificato"]);
$conn->close();
?>