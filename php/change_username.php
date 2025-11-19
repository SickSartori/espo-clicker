<?php
include 'db_connect.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$currentUsername = $data['username'];
$password = $data['password'];
$newUsername = $conn->real_escape_string(trim($data['newUsername']));

if (empty($currentUsername) || empty($password) || empty($newUsername)) {
    die(json_encode(["status" => "error", "message" => "Dati mancanti."]));
}
if (strlen($newUsername) < 3 || strlen($newUsername) > 20) {
    die(json_encode(["status" => "error", "message" => "Il nome deve essere tra 3 e 20 caratteri."]));
}

// 1. Verifica credenziali su USERS dinamica
$stmt = $conn->prepare("SELECT password_hash FROM $table_users WHERE username = ?");
$stmt->bind_param("s", $currentUsername);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows === 0) die(json_encode(["status" => "error", "message" => "Utente non trovato."]));
$row = $res->fetch_assoc();
if (!password_verify($password, $row['password_hash'])) die(json_encode(["status" => "error", "message" => "Password errata."]));

// 2. Controlla se il nuovo nome è occupato in USERS
$check = $conn->prepare("SELECT id FROM $table_users WHERE username = ?");
$check->bind_param("s", $newUsername);
$check->execute();
if ($check->get_result()->num_rows > 0) die(json_encode(["status" => "error", "message" => "Nome già in uso da un altro giocatore."]));

// 3. ESEGUI IL CAMBIO
// A. Aggiorna tabella Account (USERS)
$updateUser = $conn->prepare("UPDATE $table_users SET username = ? WHERE username = ?");
$updateUser->bind_param("ss", $newUsername, $currentUsername);

if ($updateUser->execute()) {
    // B. Aggiorna tabella Classifica (LEADERBOARD)
    $updateLeaderboard = $conn->prepare("UPDATE $table_leaderboard SET username = ? WHERE username = ?");
    $updateLeaderboard->bind_param("ss", $newUsername, $currentUsername);
    $updateLeaderboard->execute();

    echo json_encode(["status" => "success", "message" => "Nome aggiornato ovunque!"]);
} else {
    echo json_encode(["status" => "error", "message" => "Errore aggiornamento account."]);
}
$conn->close();
?>