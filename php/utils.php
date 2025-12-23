<?php
	/** checkLanguage
	 * Controlla se la lingua passata come parametro è reale o è stata "sporcata"
	 *
	 * @param string $lang lingua da utilizzare
	 * 
	 * @return string la lingua di default in caso di "sporcizia" o quella scelta dall'utente
	 */
	function checkLanguage($lang)
	{
		switch($lang)
        {
            case ENGLISH:
                return ENGLISH;
                break;
            case ITALIAN:
                return ITALIAN;
                break;
            default:
                return ITALIAN;
                break;
        }
	}
?>