-- Vacationly schema. Run against a NEW dedicated vacationly database.
-- Existing tables/data are never dropped by this script.
-- Users have one of two roles; the server stores password hashes, not passwords.
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(50) NOT NULL,
    lastName VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    passwordHash VARCHAR(200) NOT NULL,
    roleId TINYINT NOT NULL DEFAULT 2,
    CONSTRAINT chk_users_role CHECK (roleId IN (1, 2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Each vacation has its own ID so destinations may repeat across trips.
-- Price and date checks enforce the assignment's allowed values in MySQL.
CREATE TABLE IF NOT EXISTS vacations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    destination VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    continent VARCHAR(30) NOT NULL,
    description TEXT NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    price DECIMAL(7,2) NOT NULL,
    imageName VARCHAR(100) NOT NULL,
    CONSTRAINT chk_vacation_price CHECK (price >= 0 AND price <= 10000),
    CONSTRAINT chk_vacation_dates CHECK (endDate >= startDate),
    INDEX idx_vacation_start (startDate, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row represents one user's like for one vacation; the composite key
-- prevents duplicate likes, and cascade deletion removes orphaned likes.
CREATE TABLE IF NOT EXISTS likes (
    userId INT UNSIGNED NOT NULL,
    vacationId INT UNSIGNED NOT NULL,
    PRIMARY KEY (userId, vacationId),
    CONSTRAINT fk_likes_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_likes_vacation FOREIGN KEY (vacationId) REFERENCES vacations(id) ON DELETE CASCADE,
    INDEX idx_likes_vacation (vacationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
