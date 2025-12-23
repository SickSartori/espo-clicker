<?php
// template/php/api_bootstrap.php
require_once 'db_connect.php';

// Imposta header standard per tutte le risposte
header('Content-Type: application/json');

// Funzione per leggere l'input JSON
function getJsonInput() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Dati JSON non validi."]);
        exit;
    }
    return $data;
}

// Funzione per autenticare l'utente
function authenticate($conn, $username, $password) {
    global $table_users;

    if (empty($username) || empty($password)) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Credenziali mancanti."]);
        exit;
    }

    $stmt = $conn->prepare("SELECT id, username, password_hash, save_data FROM $table_users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($res->num_rows === 0) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Utente non trovato."]);
        exit;
    }

    $user = $res->fetch_assoc();
    
    if (!password_verify($password, $user['password_hash'])) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Password errata."]);
        exit;
    }

    return $user;
}
?>