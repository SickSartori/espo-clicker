<?php
include 'db_connect.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$username = $data['username'];
$password = $data['password'];

if (empty($username) || empty($password)) {
    echo json_encode(["status" => "error", "message" => "Password richiesta."]);
    exit;
}

// 1. Verifica Password
$stmt = $conn->prepare("SELECT password_hash FROM $table_users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows > 0) {
    $row = $res->fetch_assoc();
    if (password_verify($password, $row['password_hash'])) {
        
        // 2. Reset Salvataggio Utente (Setta a NULL)
        $resetUser = $conn->prepare("UPDATE $table_users SET save_data = NULL WHERE username = ?");
        $resetUser->bind_param("s", $username);
        $resetUser->execute();
        
        // 3. Rimuovi dalla Classifica (Opzionale: oppure setta a 0)
        $resetLb = $conn->prepare("DELETE FROM $table_leaderboard WHERE username = ?");
        $resetLb->bind_param("s", $username);
        $resetLb->execute();
        
        echo json_encode(["status" => "success", "message" => "Progressi resettati."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Password errata."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Utente non trovato."]);
}
$conn->close();
?>