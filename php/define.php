<?php
    // NB: le credenziali DB NON stanno qui. La connessione usa l'array
    // restituito da php/config.php (vedi php/db_connect.php).

    // General
    define("SECOND", 1);
    define("MINUTE", 60 * SECOND);
    define("HOUR", 60 * MINUTE);
    define("DAY", 24 * HOUR);
    define("MONTH", 30 * DAY);
    define("YEAR", 12 * MONTH);
	define("TOKEN_LIFETIME", 1 * HOUR);

    // PATH
    define("DOCUMENT_ROOT", $_SERVER['DOCUMENT_ROOT']);
    define("URI", "/Espo_Clicker/");
    define("ABSOLUTE_PATH", $_SERVER['DOCUMENT_ROOT'] . URI);

    // URL
    define("SCHEME", $_SERVER['REQUEST_SCHEME']);
    define("HOST", $_SERVER['HTTP_HOST']);

	// LANGUAGES
	define("ENGLISH", "en");
	define("ITALIAN", "it");
?>