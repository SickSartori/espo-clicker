<?php
	require_once(__DIR__ . "/define.php");
	require_once(__DIR__ . "/utils.php");
	require_once(__DIR__ . "/debug_parameter.php");

	// Whitelist: checkLanguage() ritorna solo 'it' o 'en' (default 'it' su input
	// sporco). Questo blinda il cookie contro path traversal / LFI sull'include sotto.
	$rawLang = $_COOKIE['user_default_language'] ?? null;
	$lang = checkLanguage($rawLang);

	// (Ri)scrive il cookie normalizzato quando mancante o diverso dal valore validato.
	if(!isset($_COOKIE['user_default_language']) || $_COOKIE['user_default_language'] !== $lang)
		setcookie("user_default_language", $lang, time() + 1 * YEAR, "/");

	// __DIR__ ancora la path al filesystem (indipendente dalla CWD del processo).
	require_once(__DIR__ . "/../langs/" . $lang . ".php");
?>