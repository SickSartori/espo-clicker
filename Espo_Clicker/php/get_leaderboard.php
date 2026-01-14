<?php
include 'db_connect.php';

// FIX: Usa CAST(score AS UNSIGNED) o DECIMAL per ordinare correttamente i numeri salvati come stringhe
$sql = "SELECT username, score, prestigeLevel, timestamp 
        FROM $table_leaderboard 
        ORDER BY prestigeLevel DESC, CAST(score AS DECIMAL(65,0)) DESC, timestamp ASC 
        LIMIT 10";

$result = $conn->query($sql);

$leaderboard = [];

if ($result && $result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $leaderboard[] = $row;
    }
}

$conn->close();

header('Content-Type: application/json');
echo json_encode($leaderboard);
?>