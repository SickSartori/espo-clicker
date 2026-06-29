<?php
/* =====================================================================
   Helper condivisi per gli endpoint Amici.
   Richiede che db_connect.php sia già stato incluso (via api_bootstrap.php):
   usa i global $table_users / $table_leaderboard / $table_friends / $table_profiles.
   Tutte le tabelle social sono chiavate su users.id (INT, immutabile).
   ===================================================================== */

if (!defined('FRIENDS_MAX'))        define('FRIENDS_MAX', 100);   // tetto amici per utente
if (!defined('FRIENDS_PENDING_MAX')) define('FRIENDS_PENDING_MAX', 50); // tetto richieste in uscita

/* Stato amicizia dal punto di vista di $me verso $other:
   'none' | 'pending_out' (io ho inviato) | 'pending_in' (devo accettare) | 'accepted' */
function friendStatusBetween($conn, $me, $other)
{
    global $table_friends;
    $stmt = $conn->prepare(
        "SELECT requester_id, status FROM $table_friends
         WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
         LIMIT 1"
    );
    $stmt->bind_param("iiii", $me, $other, $other, $me);
    $stmt->execute();
    $r = $stmt->get_result();
    if ($r->num_rows === 0) { $stmt->close(); return 'none'; }
    $row = $r->fetch_assoc();
    $stmt->close();
    if ($row['status'] === 'accepted') return 'accepted';
    return ((int)$row['requester_id'] === (int)$me) ? 'pending_out' : 'pending_in';
}

/* true se $a e $b sono amici (accepted), in qualsiasi direzione. */
function areFriends($conn, $a, $b)
{
    return friendStatusBetween($conn, (int)$a, (int)$b) === 'accepted';
}

/* Conta gli amici accettati di $uid. */
function countFriends($conn, $uid)
{
    global $table_friends;
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS c FROM $table_friends
         WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)"
    );
    $stmt->bind_param("ii", $uid, $uid);
    $stmt->execute();
    $c = (int)($stmt->get_result()->fetch_assoc()['c'] ?? 0);
    $stmt->close();
    return $c;
}

/* Snapshot pubblico "base" (da leaderboard, niente decompressione del save).
   $userRow deve avere ['id','username']. Online/ultimo-accesso via secondi-fa
   calcolati lato server (niente fuso orario sul client). */
function publicSnapshot($conn, $userRow)
{
    global $table_leaderboard;
    $uid   = (int)$userRow['id'];
    $uname = $userRow['username'];

    $snap = [
        "id"                => $uid,
        "username"          => $uname,
        "score"             => "0",
        "prestige"          => 0,
        "equippedSkin"      => "default",
        "totalFormattazioni" => 0,
        "lastSeenSecondsAgo" => null,   // null = mai visto (nessun salvataggio cloud)
    ];

    $stmt = $conn->prepare(
        "SELECT score, prestigeLevel, equippedSkin, totalFormattazioni,
                TIMESTAMPDIFF(SECOND, timestamp, NOW()) AS secs_ago
         FROM $table_leaderboard WHERE username = ?"
    );
    $stmt->bind_param("s", $uname);
    $stmt->execute();
    $r = $stmt->get_result();
    if ($row = $r->fetch_assoc()) {
        $snap["score"]              = (string)$row["score"];
        $snap["prestige"]           = (int)$row["prestigeLevel"];
        $snap["equippedSkin"]       = (string)$row["equippedSkin"];
        $snap["totalFormattazioni"] = (int)$row["totalFormattazioni"];
        if ($row["secs_ago"] !== null) $snap["lastSeenSecondsAgo"] = (int)$row["secs_ago"];
    }
    $stmt->close();
    return $snap;
}

/* Recupera ['id','username'] di un utente per id, o null se non esiste. */
function userById($conn, $id)
{
    global $table_users;
    $stmt = $conn->prepare("SELECT id, username FROM $table_users WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $r = $stmt->get_result();
    $row = $r->fetch_assoc();
    $stmt->close();
    return $row ?: null;
}
?>
