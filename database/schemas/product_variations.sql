﻿CREATE TABLE IF NOT EXISTS product_variations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, -- Ensure this matches the foreign key reference
    product_id BIGINT UNSIGNED NOT NULL,
    sku VARCHAR(100) UNIQUE,
    price DECIMAL(12,2),
    discount_price DECIMAL(12,2) DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0,
    stock_status ENUM('in_stock', 'out_of_stock', 'backorder') DEFAULT 'in_stock',
    weight DECIMAL(10,2),
    length DECIMAL(10,2),
    width DECIMAL(10,2),
    height DECIMAL(10,2),
    image_id BIGINT UNSIGNED,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE SET NULL,
    INDEX (product_id),
    INDEX (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
