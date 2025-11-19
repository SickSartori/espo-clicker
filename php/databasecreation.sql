--DROP DATABASE IF EXISTS my_espooclicker;

CREATE DATABASE my_espooclicker
CHARACTER SET utf8mb4
COLLATE utf8mb4_general_ci;

-- Seleziona il database
USE my_espooclicker;

-- 3. CREAZIONE TABELLA UTENTI (Login e Salvataggi)
CREATE TABLE users_production (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    save_data LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CREAZIONE TABELLA CLASSIFICA (Solo Punteggi Pubblici)
CREATE TABLE leaderboard_production (
    username VARCHAR(50) NOT NULL PRIMARY KEY,
    score BIGINT DEFAULT 0,
    prestigeLevel INT DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE users_dev (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    save_data LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CREAZIONE TABELLA CLASSIFICA (Solo Punteggi Pubblici)
CREATE TABLE leaderboard_dev (
    username VARCHAR(50) NOT NULL PRIMARY KEY,
    score BIGINT DEFAULT 0,
    prestigeLevel INT DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);