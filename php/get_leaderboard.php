<?php
include 'db_connect.php';

// MODIFICA: Aggiunto 'prestigeLevel' alla SELECT per poterlo mostrare nel podio
// MODIFICA: Aggiunto ordinamento secondario per prestigio in caso di pareggio
$sql = "SELECT username, score, prestigeLevel, timestamp FROM leaderboard ORDER BY score DESC, prestigeLevel DESC LIMIT 10";
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