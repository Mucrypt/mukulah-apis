CREATE TABLE IF NOT EXISTS up_sell_products (
    product_id BIGINT UNSIGNED NOT NULL,
    up_sell_product_id BIGINT UNSIGNED NOT NULL,
    position INT UNSIGNED DEFAULT 0,
    PRIMARY KEY (product_id, up_sell_product_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (up_sell_product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX (product_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
