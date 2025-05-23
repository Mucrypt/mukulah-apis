﻿CREATE TABLE IF NOT EXISTS attribute_values (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, -- Ensure UNSIGNED matches product_attribute_values.attribute_value_id
    attribute_id INT UNSIGNED NOT NULL,
    value VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    color_code VARCHAR(7),
    image_url VARCHAR(512),
    position INT UNSIGNED DEFAULT 0,
    FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE,
    UNIQUE KEY (attribute_id, slug),
    INDEX (attribute_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE attribute_values
ADD COLUMN created_at DATETIME NULL; -- Add as NULL initially

UPDATE attribute_values
SET created_at = NOW() WHERE created_at IS NULL; -- Populate with valid datetime values

ALTER TABLE attribute_values
MODIFY COLUMN created_at DATETIME NOT NULL; -- Make it NOT NULL after populating
