<?php
require_once __DIR__ . '/api_bootstrap.php';

$data = getJsonInput();
$username = trim($data['username'] ?? '');
$password = $data['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(["status" => "error", "message" => "Dati mancanti."]);
    exit;
}

// Genera un token dinamico unico per questa sessione di gioco
$sessionToken = bin2hex(random_bytes(16));
$_SESSION['save_token'] = $sessionToken;

// 1. Cerca utente
$stmt = $conn->prepare("SELECT id, password_hash, save_data FROM $table_users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$res = $stmt->get_result();

if ($row = $res->fetch_assoc()) {
    // LOGIN
    if (password_verify($password, $row['password_hash'])) {
        // Aggiunto "save_token" alla risposta
        echo json_encode(["status" => "success", "action" => "login", "save_data" => $row['save_data'], "save_token" => $sessionToken]);
    }
    else {
        echo json_encode(["status" => "error", "message" => "Password errata."]);
    }
}
else {
    // REGISTRAZIONE
    // Validazione SOLO per i nuovi account (gli utenti esistenti possono sempre loggare)
    if (!preg_match('/^[\p{L}0-9 ._-]{3,20}$/u', $username)) {
        echo json_encode(["status" => "error", "message" => "Username non valido (3-20 caratteri: lettere, numeri, spazio, . _ -)."]);
        exit;
    }
    if (strlen($password) < 8) {
        echo json_encode(["status" => "error", "message" => "La password deve avere almeno 8 caratteri."]);
        exit;
    }
    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $ins = $conn->prepare("INSERT INTO $table_users (username, password_hash) VALUES (?, ?)");
    $ins->bind_param("ss", $username, $hashed);

    if ($ins->execute()) {
        // Aggiunto "save_token" alla risposta
        echo json_encode(["status" => "success", "action" => "register", "save_data" => null, "save_token" => $sessionToken]);
    }
    else {
        echo json_encode(["status" => "error", "message" => "Username occupato o errore."]);
    }
}
$conn->close();
?>