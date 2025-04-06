CREATE TABLE IF NOT EXISTS seller_performance_metrics (
    seller_id BIGINT UNSIGNED PRIMARY KEY,
    order_fulfillment_rate DECIMAL(5,2) DEFAULT 0.00,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    response_rate DECIMAL(5,2) DEFAULT 0.00,
    response_time INT DEFAULT 0 COMMENT 'In hours',
    return_rate DECIMAL(5,2) DEFAULT 0.00,
    on_time_delivery_rate DECIMAL(5,2) DEFAULT 0.00,
    last_calculated_at TIMESTAMP NULL,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;