<?php
/* Elenco amici dell'utente loggato: amici accettati + richieste in arrivo +
   richieste inviate, ciascuno con lo snapshot pubblico. POST { username, password }. */
require_once __DIR__ . '/api_bootstrap.php';
require_once __DIR__ . '/friends_common.php';

$data = getJsonInput();
$me   = authenticate($conn, $data['username'] ?? '', $data['password'] ?? '');
$myId = (int)$me['id'];

/* Una sola query: l'utente "altro" è quello diverso da me nella coppia.
   LEFT JOIN leaderboard per lo snapshot (score/skin/last-seen). */
$sql = "SELECT f.status, f.requester_id, f.addressee_id,
               u.id   AS other_id,
               u.username AS other_username,
               lb.score, lb.prestigeLevel, lb.equippedSkin, lb.totalFormattazioni,
               TIMESTAMPDIFF(SECOND, lb.timestamp, NOW()) AS secs_ago
        FROM $table_friends f
        JOIN $table_users u
             ON u.id = IF(f.requester_id = ?, f.addressee_id, f.requester_id)
        LEFT JOIN $table_leaderboard lb ON lb.username = u.username
        WHERE f.requester_id = ? OR f.addressee_id = ?
        ORDER BY (lb.timestamp IS NULL), lb.timestamp DESC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("iii", $myId, $myId, $myId);
$stmt->execute();
$res = $stmt->get_result();

$friends  = [];
$incoming = [];
$outgoing = [];

while ($row = $res->fetch_assoc()) {
    $snap = [
        "id"                 => (int)$row['other_id'],
        "username"           => $row['other_username'],
        "score"              => $row['score'] !== null ? (string)$row['score'] : "0",
        "prestige"           => (int)$row['prestigeLevel'],
        "equippedSkin"       => $row['equippedSkin'] ?? 'default',
        "totalFormattazioni" => (int)$row['totalFormattazioni'],
        "lastSeenSecondsAgo" => $row['secs_ago'] !== null ? (int)$row['secs_ago'] : null,
    ];

    if ($row['status'] === 'accepted') {
        $friends[] = $snap;
    } elseif ((int)$row['addressee_id'] === $myId) {
        $incoming[] = $snap;   // qualcuno ha chiesto a me
    } else {
        $outgoing[] = $snap;   // io ho chiesto a qualcuno
    }
}
$stmt->close();

echo json_encode([
    "status"   => "success",
    "friends"  => $friends,
    "incoming" => $incoming,
    "outgoing" => $outgoing,
]);
$conn->close();
?>
