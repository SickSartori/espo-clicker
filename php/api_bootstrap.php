<?php
require_once __DIR__ . '/define.php';
ini_set('session.gc_maxlifetime', 86400 + 3600); // 25h — margine sopra TOKEN_LIFETIME
session_set_cookie_params([
    'lifetime'  => 86400 + 3600,
    'path'      => '/',
    'httponly'  => true,                                                   // non leggibile da JS (anti-furto cookie via XSS)
    'secure'    => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'), // Secure solo su HTTPS (su localhost http resta usabile)
    'samesite'  => 'Lax'                                                   // mitiga CSRF
]);
session_start();
require_once __DIR__ . '/db_connect.php';

// Imposta header standard per tutte le risposte
header('Content-Type: application/json');

// Funzione per leggere l'input JSON
function getJsonInput()
{
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if ($data === null) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Dati JSON non validi."]);
        exit;
    }
    return $data;
}

// Valida il token di sessione e controlla scadenza (24h)
function validateToken()
{
    $token = $_SESSION['save_token'] ?? '';
    $createdAt = $_SESSION['token_created_at'] ?? 0;

    if (empty($token)) {
        http_response_code(401);
        echo json_encode(["status" => "token_expired", "message" => "Sessione mancante. Effettua il login."]);
        exit;
    }

    if ((time() - $createdAt) > TOKEN_LIFETIME) {
        unset($_SESSION['save_token'], $_SESSION['token_created_at']);
        http_response_code(401);
        echo json_encode(["status" => "token_expired", "message" => "Sessione scaduta (24h). Effettua nuovamente il login."]);
        exit;
    }

    return $token;
}

// Funzione per autenticare l'utente
function authenticate($conn, $username, $password)
{
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