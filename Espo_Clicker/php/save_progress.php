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
$rawScore = isset($data['score']) ? $data['score'] : 0;
$rawPrestige = isset($data['prestige']) ? $data['prestige'] : 0;

// Formattazione stringa pulita
$cleanScore = number_format((float)$rawScore, 0, '', '');
$cleanPrestige = number_format((float)$rawPrestige, 0, '', '');

$clientHash = isset($data['hash']) ? $data['hash'] : '';

// Ricostruzione firma
$dataString = $cleanScore . '-' . $cleanPrestige . '-' . GAME_SECRET_KEY;
$serverHash = hash(HASH_ALGO, $dataString);

if (!hash_equals($serverHash, $clientHash)) {
    // Logga l'errore nel file di log del server, non a schermo
    error_log("Security Mismatch. User: {$user['username']} | Server: $serverHash vs Client: $clientHash");
    echo json_encode(["status" => "warning", "message" => "Salvataggio rifiutato: Integrità dati fallita."]);
    exit;
}

// 1. Salvataggio Cloud
$saveJson = json_encode($data['saveData']);
$stmt = $conn->prepare("UPDATE $table_users SET save_data = ? WHERE id = ?");
$stmt->bind_param("si", $saveJson, $user['id']);
$stmt->execute();

// 2. Aggiornamento Classifica
// Logica Rate Limit (opzionale, qui ridotta a 0 per test immediati)
$allowUpdate = true; 

if ($allowUpdate) {
    // FIX COMPATIBILITÀ & OVERFLOW
    // Usiamo una query diretta con parametri duplicati per evitare la sintassi VALUES() deprecata
    // e garantire che DECIMAL venga trattato correttamente.
    $stmtLb = $conn->prepare("
        INSERT INTO $table_leaderboard (username, score, prestigeLevel, timestamp) 
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
            score = GREATEST(score, ?), 
            prestigeLevel = GREATEST(prestigeLevel, ?),
            timestamp = NOW()
    ");
    
    // Bind: "sss" per INSERT e "ss" per UPDATE -> "sssss"
    // Parametri: Username, Score, Prestige, Score(again), Prestige(again)
    $stmtLb->bind_param("sssss", $user['username'], $cleanScore, $cleanPrestige, $cleanScore, $cleanPrestige);
    
    if (!$stmtLb->execute()) {
        error_log("Leaderboard Error: " . $stmtLb->error);
    }
}

echo json_encode(["status" => "success", "message" => "Salvato e Verificato"]);
$conn->close();
?>