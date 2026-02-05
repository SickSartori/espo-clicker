<?php
require_once __DIR__ . '/api_bootstrap.php';
$data = getJsonInput();
$user = authenticate($conn, $data['username'], $data['password']);

$conn->query("UPDATE $table_users SET save_data = NULL WHERE id = " . $user['id']);
$conn->query("DELETE FROM $table_leaderboard WHERE username = '" . $conn->real_escape_string($user['username']) . "'");

echo json_encode(["status" => "success", "message" => "Progressi resettati."]);
$conn->close();
?>