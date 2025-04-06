CREATE TABLE IF NOT EXISTS seller_notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    seller_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type ENUM('order', 'product', 'payment', 'system', 'warning') NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_id BIGINT UNSIGNED COMMENT 'ID of related entity',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE,
    INDEX (seller_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;