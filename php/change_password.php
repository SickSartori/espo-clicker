<?php
include 'db_connect.php';
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);

$username = $data['username'];
$oldPass = $data['oldPassword'];
$newPass = $data['newPassword'];

$stmt = $conn->prepare("SELECT password_hash FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows > 0) {
    $row = $res->fetch_assoc();
    if (password_verify($oldPass, $row['password_hash'])) {
        $newHash = password_hash($newPass, PASSWORD_DEFAULT);
        $update = $conn->prepare("UPDATE users SET password_hash = ? WHERE username = ?");
        $update->bind_param("ss", $newHash, $username);
        $update->execute();
        echo json_encode(["status" => "success", "message" => "Password aggiornata."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Vecchia password errata."]);
    }
}
$conn->close();
?>