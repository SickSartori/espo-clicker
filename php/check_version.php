<?php
	$config = require(__DIR__ . "/config.php");
	$cacheVer = '1.0';	// Valore di default in caso non si riesce a recuperare la versione

	// Test/sviluppo
	if($config['instanceName'] === 'dev')
	{
		if(isset($config['devVersion']))
			$cacheVer =  $config['devVersion'];
	}
	else	// Produzione
	{
		if(isset($config['prodVersion']))
			$cacheVer =  $config['prodVersion'];
	}
?>