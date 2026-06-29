<?php
/* Profilo completo di un amico: snapshot pubblico + statistiche ricche +
   armadietto skin. Accessibile SOLO tra amici accettati.
   POST { username, password, friendId }. */
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

if (!areFriends($conn, $myId, $friendId)) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Accesso negato: non siete amici."]);
    exit;
}

$friend = userById($conn, $friendId);
if (!$friend) {
    echo json_encode(["status" => "error", "message" => "Utente non trovato."]);
    exit;
}

$profile = publicSnapshot($conn, $friend);

// Statistiche ricche + armadietto skin (tabella profiles, popolata da save_progress).
$stmt = $conn->prepare(
    "SELECT total_clicks, total_playtime, longest_combo, total_golden, skins_unlocked, skins_count
     FROM $table_profiles WHERE user_id = ?"
);
$stmt->bind_param("i", $friendId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($row) {
    $unlocked = json_decode($row['skins_unlocked'] ?? '[]', true);
    if (!is_array($unlocked)) $unlocked = [];
    $profile["totalClicks"]    = (int)$row['total_clicks'];
    $profile["totalPlayTime"]  = (int)$row['total_playtime'];
    $profile["longestCombo"]   = (int)$row['longest_combo'];
    $profile["totalGolden"]    = (int)$row['total_golden'];
    $profile["skinsCount"]     = (int)$row['skins_count'];
    $profile["skinsUnlocked"]  = $unlocked;
} else {
    // Nessun profilo ricco ancora (amico che non ha salvato da v3): solo snapshot base.
    $profile["totalClicks"]   = null;
    $profile["totalPlayTime"] = null;
    $profile["longestCombo"]  = null;
    $profile["totalGolden"]   = null;
    $profile["skinsCount"]    = null;
    $profile["skinsUnlocked"] = [];
}

echo json_encode(["status" => "success", "profile" => $profile]);
$conn->close();
?>
