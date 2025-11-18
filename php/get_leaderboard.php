<?php
include 'db_connect.php';

$sql = "SELECT username, score, timestamp FROM leaderboard ORDER BY score DESC LIMIT 10";
$result = $conn->query($sql);

$leaderboard = [];

if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $leaderboard[] = $row;
    }
}

$conn->close();

// Invia i dati come JSON
header('Content-Type: application/json');
echo json_encode($leaderboard);
?>