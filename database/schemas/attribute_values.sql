CREATE TABLE IF NOT EXISTS attribute_values (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    attribute_id BIGINT UNSIGNED NOT NULL,
    value VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    color_code VARCHAR(7),
    image_url VARCHAR(512),
    position INT UNSIGNED DEFAULT 0,
    FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE,
    UNIQUE KEY (attribute_id, slug),
    INDEX (attribute_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
