<?php
	mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
	header('Content-Type: application/json'); 

	$configFile = __DIR__ . '/config.php';

	if (!file_exists($configFile)) {
		echo json_encode(["status" => "error", "message" => "Config mancante"]);
		exit;
	}

	// Carichiamo l'array dal file PHP
	$config = require($configFile);

	try {
		$conn = new mysqli($config['servername'], $config['username'], $config['password'], $config['dbname'], $config['port']);
		$conn->set_charset("utf8mb4");
	} catch (Exception $e) {
		error_log("DB Connection Error: " . $e->getMessage());
		echo json_encode(["status" => "error", "message" => "Errore interno del server."]);
		exit;
	}

	// Nomi tabelle corretti
	$table_users = 'users_' . $config['instanceName'];
	$table_leaderboard = 'leaderboard_' . $config['instanceName'];
?>