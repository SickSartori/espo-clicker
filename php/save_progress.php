<?php
include 'db_connect.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$username = $data['username'];
$password = $data['password'];

if (!isset($data['saveData'])) {
    die(json_encode(["status" => "error", "message" => "Nessun dato di salvataggio."]));
}

$saveData = json_encode($data['saveData']); 

// Verifica su USERS dinamica
$check = $conn->prepare("SELECT password_hash FROM $table_users WHERE username = ?");
$check->bind_param("s", $username);
$check->execute();
$res = $check->get_result();

if ($res->num_rows > 0) {
    $row = $res->fetch_assoc();
    if (password_verify($password, $row['password_hash'])) {
        // Aggiorna salvataggio
        $update = $conn->prepare("UPDATE $table_users SET save_data = ? WHERE username = ?");
        $update->bind_param("ss", $saveData, $username);
        $update->execute();
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Password errata."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Utente non trovato."]);
}
$conn->close();
?>