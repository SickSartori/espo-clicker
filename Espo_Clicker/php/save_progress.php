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
$newScore = isset($data['score']) ? floor($data['score']) : 0;
$newPrestige = isset($data['prestige']) ? floor($data['prestige']) : 0;
$clientHash = isset($data['hash']) ? $data['hash'] : '';

// Ricostruzione firma
$dataString = $newScore . '-' . $newPrestige . '-' . GAME_SECRET_KEY;
$serverHash = hash(HASH_ALGO, $dataString);

if (!hash_equals($serverHash, $clientHash)) {
    // SECURITY FAIL: Rifiuta TUTTO, anche il salvataggio cloud
    error_log("Security Mismatch per utente: " . $user['username']);
    echo json_encode(["status" => "warning", "message" => "Salvataggio rifiutato: Integrità dati fallita."]);
    exit;
}

// 1. Se l'hash è valido, procedi al salvataggio Cloud
$saveJson = json_encode($data['saveData']);
$stmt = $conn->prepare("UPDATE $table_users SET save_data = ? WHERE id = ?");
$stmt->bind_param("si", $saveJson, $user['id']);
$stmt->execute();

// 2. Aggiornamento Classifica BLINDATO (Sicurezza Hash)
if (isset($data['score'])) {
    $newScore = floor($data['score']);
    $newPrestige = isset($data['prestige']) ? floor($data['prestige']) : 0;
    
    // --- CONTROLLO HASH (CHECKSUM) ---
    $clientHash = isset($data['hash']) ? $data['hash'] : '';
    
    // Ricostruiamo la stringa originale: Punteggio-Prestigio-ChiaveSegreta
    $dataString = $newScore . '-' . $newPrestige . '-' . GAME_SECRET_KEY;
    $serverHash = hash(HASH_ALGO, $dataString);

    if (!hash_equals($serverHash, $clientHash)) {
        echo json_encode(["status" => "warning", "message" => "Salvataggio OK, ma Classifica rifiutata (Security Mismatch)."]);
        exit;
    }
    // ---------------------------------

    // Recupera l'ultimo punteggio e timestamp dalla classifica
    $checkStmt = $conn->prepare("SELECT score, timestamp FROM $table_leaderboard WHERE username = ?");
    $checkStmt->bind_param("s", $user['username']);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    $oldEntry = $result->fetch_assoc();

    $allowUpdate = true;

    if ($oldEntry) {
        $lastUpdate = strtotime($oldEntry['timestamp']);
        $timeDiff = time() - $lastUpdate;

        // REGOLA 1: Rate Limiting (Minimo 10 secondi tra aggiornamenti classifica)
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
        $stmtLb->bind_param("sii", $user['username'], $newScore, $newPrestige);
        $stmtLb->execute();
    }
}

echo json_encode(["status" => "success", "message" => "Salvato e Verificato"]);
$conn->close();
?>