<?php
require_once __DIR__ . '/api_bootstrap.php';

$data = getJsonInput();
$user = authenticate($conn, $data['username'], $data['password']);
$newUsername = trim($data['newUsername']);

if (mb_strlen($newUsername, 'UTF-8') < 3 || mb_strlen($newUsername, 'UTF-8') > 20) {
    echo json_encode(["status" => "error", "message" => "Nome non valido (3-20 caratteri)."]);
    exit;
}

// Check duplicati
$check = $conn->prepare("SELECT id FROM $table_users WHERE username = ?");
$check->bind_param("s", $newUsername);
$check->execute();
if ($check->get_result()->num_rows > 0) {
    echo json_encode(["status" => "error", "message" => "Nome già in uso."]);
    exit;
}

// Aggiorna
$conn->begin_transaction();
try {
    $stmt1 = $conn->prepare("DELETE FROM $table_leaderboard WHERE username = ?");
    $stmt1->bind_param("s", $newUsername);
    $stmt1->execute();

    $upd = $conn->prepare("UPDATE $table_users SET username = ? WHERE id = ?");
    $upd->bind_param("si", $newUsername, $user['id']);
    $upd->execute();

    $updLb = $conn->prepare("UPDATE $table_leaderboard SET username = ? WHERE username = ?");
    $updLb->bind_param("ss", $newUsername, $user['username']);
    $updLb->execute();

    $conn->commit();
    echo json_encode(["status" => "success", "message" => "Nome aggiornato!"]);
}
catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => "Errore DB."]);
}
$conn->close();
?>