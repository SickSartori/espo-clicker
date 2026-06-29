<?php
/* Invia una richiesta di amicizia. POST { username, password, targetId }.
   Se esiste già una richiesta inversa in attesa → accettazione reciproca. */
require_once __DIR__ . '/api_bootstrap.php';
require_once __DIR__ . '/friends_common.php';

$data     = getJsonInput();
$me       = authenticate($conn, $data['username'] ?? '', $data['password'] ?? '');
$myId     = (int)$me['id'];
$targetId = (int)($data['targetId'] ?? 0);

if ($targetId <= 0 || $targetId === $myId) {
    echo json_encode(["status" => "error", "message" => "Destinatario non valido."]);
    exit;
}

$target = userById($conn, $targetId);
if (!$target) {
    echo json_encode(["status" => "error", "message" => "Utente non trovato."]);
    exit;
}

$rel = friendStatusBetween($conn, $myId, $targetId);

if ($rel === 'accepted') {
    echo json_encode(["status" => "error", "message" => "Siete già amici."]);
    exit;
}
if ($rel === 'pending_out') {
    echo json_encode(["status" => "error", "message" => "Richiesta già inviata."]);
    exit;
}

if ($rel === 'pending_in') {
    // L'altro mi aveva già chiesto: accetto reciprocamente.
    if (countFriends($conn, $myId) >= FRIENDS_MAX) {
        echo json_encode(["status" => "error", "message" => "Hai raggiunto il limite di amici."]);
        exit;
    }
    $upd = $conn->prepare("UPDATE $table_friends SET status = 'accepted' WHERE requester_id = ? AND addressee_id = ?");
    $upd->bind_param("ii", $targetId, $myId);
    $upd->execute();
    $upd->close();
    echo json_encode(["status" => "success", "result" => "accepted", "message" => "Ora siete amici!"]);
    exit;
}

// rel === 'none' → nuova richiesta in attesa.
// Tetto richieste in uscita per evitare spam.
$cntStmt = $conn->prepare("SELECT COUNT(*) AS c FROM $table_friends WHERE requester_id = ? AND status = 'pending'");
$cntStmt->bind_param("i", $myId);
$cntStmt->execute();
$pendingOut = (int)($cntStmt->get_result()->fetch_assoc()['c'] ?? 0);
$cntStmt->close();
if ($pendingOut >= FRIENDS_PENDING_MAX) {
    echo json_encode(["status" => "error", "message" => "Troppe richieste in sospeso."]);
    exit;
}

$ins = $conn->prepare("INSERT INTO $table_friends (requester_id, addressee_id, status) VALUES (?, ?, 'pending')");
$ins->bind_param("ii", $myId, $targetId);
$ins->execute();
$ins->close();

echo json_encode(["status" => "success", "result" => "pending", "message" => "Richiesta inviata."]);
$conn->close();
?>
