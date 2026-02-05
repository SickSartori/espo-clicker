<?php
require_once __DIR__ . '/api_bootstrap.php';
$data = getJsonInput();
$user = authenticate($conn, $data['username'], $data['password']);

$stmt = $conn->prepare("DELETE FROM $table_users WHERE id = ?");
$stmt->bind_param("i", $user['id']);
$stmt->execute();
$stmt->close();

$stmt = $conn->prepare("DELETE FROM $table_leaderboard WHERE username = ?");
$stmt->bind_param("s", $user['username']);
$stmt->execute();
$stmt->close();

echo json_encode(["status" => "success", "message" => "Account eliminato."]);
$conn->close();
?>