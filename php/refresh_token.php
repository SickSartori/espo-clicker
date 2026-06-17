<?php
require_once __DIR__ . '/api_bootstrap.php';
require_once __DIR__ . '/security_config.php';

// Niente errori a schermo: risposta sempre JSON pulita
error_reporting(0);
ini_set('display_errors', 0);

// Refresh SILENZIOSO del token di sessione: rinnova la finestra di 24h riusando le
// credenziali, SENZA toccare salvataggio o classifica. Stessa protezione anti
// brute-force del login (altrimenti sarebbe un oracolo di password non limitato).
// Fail-safe: se fallisce, il client ricade sul controllo di scadenza reattivo di
// save_progress.php.
$data = getJsonInput();
$username = trim($data['username'] ?? '');
$password = $data['password'] ?? '';

if ($username === '' || $password === '') {
    echo json_encode(["status" => "error", "message" => "Dati mancanti."]);
    exit;
}

// Rate limiting per IP (come login_register.php)
$__ip = clientIp();
if (tooManyAttempts($conn, $__ip)) {
    http_response_code(429);
    echo json_encode(["status" => "error", "message" => "Troppi tentativi. Riprova tra qualche minuto."]);
    exit;
}

$stmt = $conn->prepare("SELECT password_hash FROM $table_users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();

if (!$row || !password_verify($password, $row['password_hash'])) {
    recordFailedAttempt($conn, $__ip);
    echo json_encode(["status" => "error", "message" => "Credenziali non valide."]);
    exit;
}
clearAttempts($conn, $__ip);

// Emette un nuovo token (stessa logica di emissione del login)
$sessionToken = bin2hex(random_bytes(16));
$_SESSION['save_token'] = $sessionToken;
$_SESSION['token_created_at'] = time();

echo json_encode([
    "status" => "success",
    "save_token" => $sessionToken,
    "token_expires_at" => time() + TOKEN_LIFETIME
]);
$conn->close();
?>
