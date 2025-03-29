CREATE TABLE IF NOT EXISTS product_attribute_values (
    product_attribute_id BIGINT UNSIGNED NOT NULL,
    attribute_value_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (product_attribute_id, attribute_value_id),
    FOREIGN KEY (product_attribute_id) REFERENCES product_attributes(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_value_id) REFERENCES attribute_values(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
