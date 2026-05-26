<?php
include __DIR__ . '/db_connect.php';

header('Content-Type: application/json');

try {
    // Ordine di priorità: Formattazioni > Prestigio > Punteggio (Score)
    // LIMIT 100: evita full-table scan/dump su host condiviso (Altervista) al crescere degli utenti.
    $sql = "SELECT username, score, prestigeLevel, equippedSkin, totalFormattazioni, timestamp
            FROM $table_leaderboard
            ORDER BY totalFormattazioni DESC, prestigeLevel DESC, CAST(score AS DECIMAL(65,0)) DESC, timestamp ASC
            LIMIT 100";

    $result = $conn->query($sql);
    $leaderboard = [];

    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $leaderboard[] = $row;
        }
    }

    echo json_encode($leaderboard);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Colonne mancanti nel DB. Assicurati di aver eseguito le query ALTER TABLE."]);
}

$conn->close();
?>