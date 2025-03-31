CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    short_description TEXT,
    price DECIMAL(12,2) NOT NULL,
    discount_price DECIMAL(12,2) DEFAULT 0.00,
    cost_price DECIMAL(12,2),
    sku VARCHAR(100) NOT NULL UNIQUE,
    upc VARCHAR(100),
    ean VARCHAR(100),
    isbn VARCHAR(100),
    brand_id BIGINT UNSIGNED,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    stock_status ENUM('in_stock', 'out_of_stock', 'backorder') DEFAULT 'in_stock',
    weight DECIMAL(10,2),
    length DECIMAL(10,2),
    width DECIMAL(10,2),
    height DECIMAL(10,2),
    min_order_quantity INT DEFAULT 1,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT FALSE,
    is_bestseller BOOLEAN DEFAULT FALSE,
    is_new BOOLEAN DEFAULT FALSE,
    needs_shipping BOOLEAN DEFAULT TRUE,
    tax_class VARCHAR(100),
    views_count INT UNSIGNED DEFAULT 0,
    sales_count INT UNSIGNED DEFAULT 0,
    wishlist_count INT UNSIGNED DEFAULT 0,
    rating_total INT UNSIGNED DEFAULT 0,
    rating_count INT UNSIGNED DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (slug),
    INDEX (sku),
    INDEX (brand_id),
    INDEX (status),
    INDEX (is_featured),
    INDEX (is_bestseller),
    INDEX (average_rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_attributes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    attribute_id BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_attribute_values (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_attribute_id BIGINT UNSIGNED NOT NULL,
    attribute_value_id BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (product_attribute_id) REFERENCES product_attributes(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_value_id) REFERENCES attribute_values(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_tags (
    product_id BIGINT UNSIGNED NOT NULL,
    tag_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (product_id, tag_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
