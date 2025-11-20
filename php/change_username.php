<?php
include 'db_connect.php';
header('Content-Type: application/json');

$input = file_get_contents('php://input');
$data = json_decode($input, true);

$currentUsername = $data['username'] ?? '';
$password = $data['password'] ?? '';
$newUsername = trim($data['newUsername'] ?? '');

// Validazione Base
if (empty($currentUsername) || empty($password) || empty($newUsername)) {
    echo json_encode(["status" => "error", "message" => "Dati mancanti."]);
    exit;
}

if (strlen($newUsername) < 3 || strlen($newUsername) > 20) {
    echo json_encode(["status" => "error", "message" => "Il nome deve essere tra 3 e 20 caratteri."]);
    exit;
}

if ($currentUsername === $newUsername) {
    echo json_encode(["status" => "error", "message" => "Il nuovo nome è uguale a quello attuale."]);
    exit;
}

// 1. Verifica credenziali dell'utente ATTUALE
$stmt = $conn->prepare("SELECT password_hash FROM $table_users WHERE username = ?");
$stmt->bind_param("s", $currentUsername);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows === 0) {
    echo json_encode(["status" => "error", "message" => "Utente non trovato."]);
    exit;
}

$row = $res->fetch_assoc();
if (!password_verify($password, $row['password_hash'])) {
    echo json_encode(["status" => "error", "message" => "Password errata."]);
    exit;
}
$stmt->close();

// 2. CHECK DUPLICATI: Controlla se il NUOVO nome è già preso
$check = $conn->prepare("SELECT id FROM $table_users WHERE username = ?");
$check->bind_param("s", $newUsername);
$check->execute();
$check->store_result(); // Più sicuro per contare le righe su tutti i driver

if ($check->num_rows > 0) {
    echo json_encode(["status" => "error", "message" => "Nome già in uso da un altro giocatore."]);
    exit;
}
$check->close();

// 3. ESEGUI IL CAMBIO
// A. Aggiorna tabella Account (USERS)
$updateUser = $conn->prepare("UPDATE $table_users SET username = ? WHERE username = ?");
$updateUser->bind_param("ss", $newUsername, $currentUsername);

if ($updateUser->execute()) {
    // B. Aggiorna tabella Classifica (LEADERBOARD)
    // Nota: Usiamo IGNORE per evitare crash rari, ma l'update dovrebbe andare liscio
    $updateLeaderboard = $conn->prepare("UPDATE IGNORE $table_leaderboard SET username = ? WHERE username = ?");
    $updateLeaderboard->bind_param("ss", $newUsername, $currentUsername);
    $updateLeaderboard->execute();

    echo json_encode(["status" => "success", "message" => "Nome aggiornato con successo!"]);
} else {
    echo json_encode(["status" => "error", "message" => "Errore aggiornamento database: " . $conn->error]);
}

$conn->close();
?>