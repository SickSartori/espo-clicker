<?php
	require_once(__DIR__ . "/define.php");
	require_once(__DIR__ . "/utils.php");
	require_once(__DIR__ . "/debug_parameter.php");

	if(isset($_COOKIE['user_default_language']) && !is_null($_COOKIE['user_default_language']) && $_COOKIE['user_default_language'])
		$lang = $_COOKIE['user_default_language'];
	else
		$lang = ITALIAN;

	if(!isset($_COOKIE['user_default_language']) || is_null($_COOKIE['user_default_language']) || $_COOKIE['user_default_language'] === 0 || $lang !== $_COOKIE['user_default_language'])
		setcookie("user_default_language", $lang, time() + 1 * YEAR);

	require_once("langs/" . $lang . ".php");
?>