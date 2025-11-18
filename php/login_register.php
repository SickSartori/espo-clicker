<?php
include 'db_connect.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$username = $conn->real_escape_string(trim($data['username']));
$password = $data['password'];

if (empty($username) || empty($password)) {
    die(json_encode(["status" => "error", "message" => "Dati mancanti."]));
}

// Cerca nella tabella USERS (non leaderboard)
$stmt = $conn->prepare("SELECT password_hash, save_data FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    // UTENTE ESISTE -> LOGIN
    $row = $result->fetch_assoc();
    if (password_verify($password, $row['password_hash'])) {
        echo json_encode([
            "status" => "success", 
            "action" => "login",
            "save_data" => $row['save_data']
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Password errata."]);
    }
} else {
    // UTENTE NUOVO -> REGISTRAZIONE IN USERS
    $hashedPwd = password_hash($password, PASSWORD_DEFAULT);
    // Inseriamo solo nome e password, il salvataggio arriverà dopo
    $insert = $conn->prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
    $insert->bind_param("ss", $username, $hashedPwd);
    
    if ($insert->execute()) {
        echo json_encode(["status" => "success", "action" => "register", "save_data" => null]);
    } else {
        echo json_encode(["status" => "error", "message" => "Nome utente non valido o errore server."]);
    }
}
$conn->close();
?>