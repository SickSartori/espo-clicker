<?php
	$config = require(__DIR__ . "/config.php");

	// Test/sviluppo
	if($config['instanceName'] === 'dev')
	{
		error_reporting(E_ALL); // Setta il livello di errore php da visualizzare a schermo (0 -> nessuno, E_ALL -> tutti)
		ini_set('ignore_repeated_errors', TRUE); // always use TRUE
		ini_set('display_errors', TRUE); // Error/Exception display, use FALSE only in production environment or real server. Use TRUE in development environment
		ini_set('log_errors', TRUE); // Error/Exception file logging engine
	}
	else	// Produzione
	{
		error_reporting(0); // Setta il livello di errore php da visualizzare a schermo (0 -> nessuno, E_ALL -> tutti)
		ini_set('ignore_repeated_errors', TRUE); // always use TRUE
		ini_set('display_errors', FALSE); // Error/Exception display, use FALSE only in production environment or real server. Use TRUE in development environment
		ini_set('log_errors', TRUE); // Error/Exception file logging engine
	}
?>