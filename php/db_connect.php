<?php
// Configurazione esterna
$configFile = __DIR__ . '/config.json';

if (!file_exists($configFile)) {
    die(json_encode(["status" => "error", "message" => "File di configurazione mancante."]));
}

$configData = file_get_contents($configFile);
$config = json_decode($configData, true);

if ($config === null) {
    die(json_encode(["status" => "error", "message" => "Errore nel parsing del JSON."]));
}

$servername = $config['servername'];
$username = $config['username'];
$password = $config['password'];
$dbname = $config['dbname'];
$port = isset($config['port']) ? $config['port'] : 3306;
$instancename = $config['instancename'];

// Crea connessione
$conn = new mysqli($servername, $username, $password, $dbname, $port);

// Controlla connessione
if ($conn->connect_error) {
    die("Connessione fallita: " . $conn->connect_error);
}

// --- DEFINIZIONE NOMI TABELLE DINAMICI ---
// Queste variabili saranno disponibili in tutti i file che includono db_connect.php
$table_users = $instancename . '_users';
$table_leaderboard = $instancename . '_leaderboard';
?>