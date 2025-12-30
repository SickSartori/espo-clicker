<?php
	require_once("define.php");
	require_once("utils.php");
	require_once("debug_parameter.php");

	if(isset($_GET['language']))
		$lang = checkLanguage($_GET['language']);
	else if(isset($_COOKIE['user_default_language']) && !is_null($_COOKIE['user_default_language']) && $_COOKIE['user_default_language'])
		$lang = $_COOKIE['user_default_language'];
	else
		$lang = ITALIAN;

	if(!isset($_COOKIE['user_default_language']) || is_null($_COOKIE['user_default_language']) || $_COOKIE['user_default_language'] === 0 || $lang !== $_COOKIE['user_default_language'])
		setcookie("user_default_language", $lang, time() + 1 * YEAR);

	require_once("langs/" . $lang . ".php");
?>