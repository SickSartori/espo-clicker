<?php
/* Cerca un utente per username ESATTO. Ritorna lo snapshot pubblico + la
   relazione con chi cerca. POST { username, password, query }. */
require_once __DIR__ . '/api_bootstrap.php';
require_once __DIR__ . '/friends_common.php';

$data = getJsonInput();
$me   = authenticate($conn, $data['username'] ?? '', $data['password'] ?? '');
$q    = trim($data['query'] ?? '');

if ($q === '') {
    echo json_encode(["status" => "error", "message" => "Nome da cercare mancante."]);
    exit;
}

$stmt = $conn->prepare("SELECT id, username FROM $table_users WHERE username = ?");
$stmt->bind_param("s", $q);
$stmt->execute();
$res = $stmt->get_result();
$target = $res->fetch_assoc();
$stmt->close();

if (!$target) {
    echo json_encode(["status" => "success", "found" => false]);
    exit;
}

if ((int)$target['id'] === (int)$me['id']) {
    echo json_encode(["status" => "success", "found" => false, "self" => true]);
    exit;
}

echo json_encode([
    "status"   => "success",
    "found"    => true,
    "user"     => publicSnapshot($conn, $target),
    "relation" => friendStatusBetween($conn, (int)$me['id'], (int)$target['id']),
]);
$conn->close();
?>
