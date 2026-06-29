<?php
/* Accetta o rifiuta una richiesta in arrivo.
   POST { username, password, requesterId, action: 'accept' | 'reject' }. */
require_once __DIR__ . '/api_bootstrap.php';
require_once __DIR__ . '/friends_common.php';

$data    = getJsonInput();
$me      = authenticate($conn, $data['username'] ?? '', $data['password'] ?? '');
$myId    = (int)$me['id'];
$reqId   = (int)($data['requesterId'] ?? 0);
$action  = ($data['action'] ?? '') === 'accept' ? 'accept' : 'reject';

if ($reqId <= 0) {
    echo json_encode(["status" => "error", "message" => "Richiesta non valida."]);
    exit;
}

// Deve esistere una richiesta PENDING dove io sono il destinatario.
$chk = $conn->prepare("SELECT id FROM $table_friends WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'");
$chk->bind_param("ii", $reqId, $myId);
$chk->execute();
$exists = $chk->get_result()->num_rows > 0;
$chk->close();

if (!$exists) {
    echo json_encode(["status" => "error", "message" => "Nessuna richiesta da gestire."]);
    exit;
}

if ($action === 'accept') {
    if (countFriends($conn, $myId) >= FRIENDS_MAX) {
        echo json_encode(["status" => "error", "message" => "Hai raggiunto il limite di amici."]);
        exit;
    }
    $upd = $conn->prepare("UPDATE $table_friends SET status = 'accepted' WHERE requester_id = ? AND addressee_id = ?");
    $upd->bind_param("ii", $reqId, $myId);
    $upd->execute();
    $upd->close();
    echo json_encode(["status" => "success", "result" => "accepted"]);
} else {
    $del = $conn->prepare("DELETE FROM $table_friends WHERE requester_id = ? AND addressee_id = ?");
    $del->bind_param("ii", $reqId, $myId);
    $del->execute();
    $del->close();
    echo json_encode(["status" => "success", "result" => "rejected"]);
}
$conn->close();
?>
