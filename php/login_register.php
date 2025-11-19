<?php
require_once 'db_connect.php'; // Include la connessione e i nomi tabelle

// Leggi l'input JSON
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
     echo json_encode(["status" => "error", "message" => "Dati inviati non validi."]);
     exit;
}

$username = trim($data['username'] ?? '');
$password = $data['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(["status" => "error", "message" => "Inserisci username e password."]);
    exit;
}

try {
    // 1. Cerca l'utente
    $stmt = $conn->prepare("SELECT id, password_hash, save_data FROM $table_users WHERE username = ?");
    if (!$stmt) {
        throw new Exception("Errore query select: " . $conn->error);
    }
    
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        // --- LOGIN ---
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
        // --- REGISTRAZIONE ---
        $hashedPwd = password_hash($password, PASSWORD_DEFAULT);
        
        $insert = $conn->prepare("INSERT INTO $table_users (username, password_hash) VALUES (?, ?)");
        if (!$insert) {
            throw new Exception("Errore query insert: " . $conn->error);
        }
        
        $insert->bind_param("ss", $username, $hashedPwd);
        
        if ($insert->execute()) {
            echo json_encode(["status" => "success", "action" => "register", "save_data" => null]);
        } else {
            echo json_encode(["status" => "error", "message" => "Impossibile registrare (forse username già preso?)."]);
        }
    }
} catch (Exception $e) {
    // Cattura qualsiasi errore del DB e lo manda al gioco in modo pulito
    echo json_encode(["status" => "error", "message" => "Errore Server: " . $e->getMessage()]);
}
?>