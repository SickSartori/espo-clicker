<?php
require_once 'api_bootstrap.php';

$data = getJsonInput();
$user = authenticate($conn, $data['username'], $data['password']);

if (!isset($data['saveData'])) {
    echo json_encode(["status" => "error", "message" => "Nessun dato."]);
    exit;
}

// 1. Aggiorna il salvataggio compresso (Sempre permesso per non perdere progressi)
$saveJson = json_encode($data['saveData']);
$stmt = $conn->prepare("UPDATE $table_users SET save_data = ? WHERE id = ?");
$stmt->bind_param("si", $saveJson, $user['id']);
$stmt->execute();

// 2. Aggiornamento Classifica PROTETTO
if (isset($data['score'])) {
    $newScore = floor($data['score']);
    $newPrestige = isset($data['prestige']) ? floor($data['prestige']) : 0;
    
    // Recupera l'ultimo punteggio e timestamp dalla classifica
    $checkStmt = $conn->prepare("SELECT score, timestamp FROM $table_leaderboard WHERE username = ?");
    $checkStmt->bind_param("s", $user['username']);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    $oldEntry = $result->fetch_assoc();

    $allowUpdate = true;

    if ($oldEntry) {
        $oldScore = $oldEntry['score'];
        $lastUpdate = strtotime($oldEntry['timestamp']);
        $timeDiff = time() - $lastUpdate;

        // REGOLA 1: Rate Limiting (Minimo 10 secondi tra aggiornamenti classifica)
        if ($timeDiff < 10) {
            $allowUpdate = false; 
        }

        // REGOLA 2: Sanity Check (Esempio: Non puoi fare più di 10^15 punti al secondo)
        // Questo valore va tarato sul bilanciamento del tuo gioco
        $scoreDiff = $newScore - $oldScore;
        if ($timeDiff > 0 && ($scoreDiff / $timeDiff) > 1000000000000000) {
             // $allowUpdate = false; // Decommenta per bloccare i cheater palesi
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

echo json_encode(["status" => "success", "message" => "Salvato"]);
$conn->close();
?>