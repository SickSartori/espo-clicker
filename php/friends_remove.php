<?php
/* Rimuove un'amicizia (o annulla una richiesta) tra me e $friendId, in
   qualsiasi direzione. POST { username, password, friendId }. */
require_once __DIR__ . '/api_bootstrap.php';
require_once __DIR__ . '/friends_common.php';

$data     = getJsonInput();
$me       = authenticate($conn, $data['username'] ?? '', $data['password'] ?? '');
$myId     = (int)$me['id'];
$friendId = (int)($data['friendId'] ?? 0);

if ($friendId <= 0) {
    echo json_encode(["status" => "error", "message" => "Amico non valido."]);
    exit;
}

$del = $conn->prepare(
    "DELETE FROM $table_friends
     WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)"
);
$del->bind_param("iiii", $myId, $friendId, $friendId, $myId);
$del->execute();
$removed = $del->affected_rows;
$del->close();

echo json_encode(["status" => "success", "removed" => (int)$removed]);
$conn->close();
?>
