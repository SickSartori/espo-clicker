<?php
require_once 'db_connect.php';

$input = file_get_contents('php://input');
$data = json_decode($input, true);

$username = $data['username'] ?? '';
$password = $data['password'] ?? '';

if (empty($username) || empty($password)) {
    die(json_encode(["status" => "error", "message" => "Autenticazione mancante."]));
}

// 1. VERIFICA CREDENZIALI E RECUPERA IL SALVATAGGIO (SAVE_DATA)
// Selezioniamo anche il 'save_data' oltre all'hash
$stmt = $conn->prepare("SELECT password_hash, save_data FROM $table_users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$res = $stmt->get_result();

if ($row = $res->fetch_assoc()) {
    if (password_verify($password, $row['password_hash'])) {
        
        // 2. ESTRAZIONE SICURA DEI DATI DAL SERVER (NON DALL'INPUT UTENTE)
        $serverSaveData = json_decode($row['save_data'], true);
        
        // Se non c'è un salvataggio valido, usiamo 0
        $realScore = isset($serverSaveData['lifetimeScore']) ? floor($serverSaveData['lifetimeScore']) : 0;
        $realPrestige = isset($serverSaveData['totalResets']) ? floor($serverSaveData['totalResets']) : 0;
        
        // Controllo anti-cheat base: se i valori sono negativi o assurdi (opzionale)
        if ($realScore < 0) $realScore = 0;

        // 3. AGGIORNAMENTO CLASSIFICA CON I DATI REALI
        $update = $conn->prepare("
            INSERT INTO $table_leaderboard (username, score, prestigeLevel) 
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            score = ?,       -- Sovrascriviamo col valore del save_data più recente
            prestigeLevel = ?
        ");

        // Nota: Qui usiamo i valori estratti ($realScore), non quelli inviati via POST
        $update->bind_param("sidii", $username, $realScore, $realPrestige, $realScore, $realPrestige);

        if ($update->execute()) {
            echo json_encode(["status" => "success", "message" => "Classifica sincronizzata."]);
        } else {
            echo json_encode(["status" => "error", "message" => "Errore aggiornamento DB."]);
        }
        $update->close();
        
    } else {
        echo json_encode(["status" => "error", "message" => "Password errata."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Utente non trovato."]);
}

$stmt->close();
$conn->close();
?>