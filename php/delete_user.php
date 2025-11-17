<?php
include 'db_connect.php';

// Prende i dati inviati dal JavaScript
$data = json_decode(file_get_contents('php://input'), true);

$username = $data['username'];

if (empty($username)) {
    die(json_encode(["status" => "error", "message" => "Nome utente non fornito."]));
}

// Prepara la query per evitare SQL Injection
$stmt = $conn->prepare("DELETE FROM leaderboard WHERE username = ?");
$stmt->bind_param("s", $username); // "s" per string

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Punteggi utente cancellati."]);
} else {
    echo json_encode(["status" => "error", "message" => $stmt->error]);
}

$stmt->close();
$conn->close();
?>