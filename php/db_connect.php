<?php
$servername = "localhost";
$username = "root"; // Utente standard di MAMP
$password = "root"; // Password standard di MAMP (o vuota: "")
$dbname = "my_espooclicker"; // Il database che hai creato
$port = 3306;

// Crea connessione
$conn = new mysqli($servername, $username, $password, $dbname);

// Controlla connessione
if ($conn->connect_error) {
    die("Connessione fallita: " . $conn->connect_error);
}
?>