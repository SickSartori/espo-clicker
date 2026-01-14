<?php
include 'db_connect.php';

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