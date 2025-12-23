<?php
require_once 'api_bootstrap.php';

$data = getJsonInput();
$user = authenticate($conn, $data['username'], $data['oldPassword']);

$newHash = password_hash($data['newPassword'], PASSWORD_DEFAULT);
$stmt = $conn->prepare("UPDATE $table_users SET password_hash = ? WHERE id = ?");
$stmt->bind_param("si", $newHash, $user['id']);
$stmt->execute();

echo json_encode(["status" => "success", "message" => "Password aggiornata."]);
$conn->close();
?>