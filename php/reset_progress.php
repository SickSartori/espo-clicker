<?php
require_once __DIR__ . '/api_bootstrap.php';
$data = getJsonInput();
$user = authenticate($conn, $data['username'], $data['password']);

$stmt1 = $conn->prepare("UPDATE $table_users SET save_data = NULL WHERE id = ?");
$stmt1->bind_param("i", $user['id']);
$stmt1->execute();

$stmt2 = $conn->prepare("DELETE FROM $table_leaderboard WHERE username = ?");
$stmt2->bind_param("s", $user['username']);
$stmt2->execute();

echo json_encode(["status" => "success", "message" => "Progressi resettati."]);
$conn->close();
?>