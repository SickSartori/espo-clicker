<?php
require_once 'api_bootstrap.php';
require_once 'security_config.php';

// Disable error reporting to screen to avoid breaking JSON
error_reporting(0);
ini_set('display_errors', 0);

// Receive JSON input
$data = getJsonInput();
$user = authenticate($conn, $data['username'], $data['password']);

if (!isset($data['saveData'])) {
    echo json_encode(["status" => "error", "message" => "No data provided."]);
    exit;
}

// --- SECURITY VALIDATION ---
$rawScore = isset($data['score']) ? (string)$data['score'] : "0";
$rawPrestige = isset($data['prestige']) ? (string)$data['prestige'] : "0";

// Basic cleanup
if (!preg_match('/^[0-9\.eE\+\-]+$/', $rawScore)) { 
    $rawScore = "0"; 
}
if (!preg_match('/^[0-9\.eE\+\-]+$/', $rawPrestige)) { 
    $rawPrestige = "0"; 
}

// Hash check
$clientHash = isset($data['hash']) ? $data['hash'] : '';
$dataString = $rawScore . '-' . $rawPrestige . '-' . GAME_SECRET_KEY;
$serverHash = hash(HASH_ALGO, $dataString);

if (!hash_equals($serverHash, $clientHash)) {
    // Log invalid hash attempt
    error_log("Security Mismatch. User: {$user['username']}");
    echo json_encode(["status" => "warning", "message" => "Save rejected: Integrity check failed."]);
    exit;
}

// 1. Save Cloud Data (Full JSON)
$saveJson = json_encode($data['saveData']);
$stmt = $conn->prepare("UPDATE $table_users SET save_data = ? WHERE id = ?");
$stmt->bind_param("si", $saveJson, $user['id']);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database save failed."]);
    exit;
}

// 2. Update Leaderboard
// Since score is VARCHAR, we cannot easily use GREATEST in SQL. 
// We overwrite the score with the latest save. Game client logic should ensure score doesn't decrease.
$stmtLb = $conn->prepare("
    INSERT INTO $table_leaderboard (username, score, prestigeLevel, timestamp) 
    VALUES (?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE 
        score = VALUES(score), 
        prestigeLevel = VALUES(prestigeLevel),
        timestamp = NOW()
");

$stmtLb->bind_param("sss", $user['username'], $rawScore, $rawPrestige);

if (!$stmtLb->execute()) {
    // Log leaderboard error but don't fail the main save request
    error_log("Leaderboard Error: " . $stmtLb->error);
}

echo json_encode(["status" => "success", "message" => "Saved and Verified"]);
$conn->close();
?>