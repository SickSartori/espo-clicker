<?php
require_once __DIR__ . '/api_bootstrap.php';

$data = getJsonInput();
$user = authenticate($conn, $data['username'], $data['oldPassword']);

$newPassword = $data['newPassword'] ?? '';
if (strlen($newPassword) < 8) {
    echo json_encode(["status" => "error", "message" => "La password deve avere almeno 8 caratteri."]);
    exit;
}

$newHash = password_hash($newPassword, PASSWORD_DEFAULT);
$stmt = $conn->prepare("UPDATE $table_users SET password_hash = ? WHERE id = ?");
$stmt->bind_param("si", $newHash, $user['id']);
$stmt->execute();

echo json_encode(["status" => "success", "message" => "Password aggiornata."]);
$conn->close();
?>