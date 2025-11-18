<?php
include 'db_connect.php';
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);
$username = $data['username'];
$password = $data['password'];

$stmt = $conn->prepare("SELECT password_hash FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows > 0) {
    $row = $res->fetch_assoc();
    if (password_verify($password, $row['password_hash'])) {
        // 1. Cancella da USERS
        $del1 = $conn->prepare("DELETE FROM users WHERE username = ?");
        $del1->bind_param("s", $username);
        $del1->execute();
        
        // 2. Cancella da LEADERBOARD
        $del2 = $conn->prepare("DELETE FROM leaderboard WHERE username = ?");
        $del2->bind_param("s", $username);
        $del2->execute();
        
        echo json_encode(["status" => "success", "message" => "Account eliminato."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Password errata."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Utente non trovato."]);
}
$conn->close();
?>