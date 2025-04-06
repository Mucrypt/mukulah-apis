CREATE TABLE IF NOT EXISTS variation_attributes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_variation_id INT NOT NULL, -- Ensure this column exists
    attribute_id INT NOT NULL,
    attribute_value_id INT NOT NULL,
    FOREIGN KEY (product_variation_id) REFERENCES product_variations(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_value_id) REFERENCES attribute_values(id) ON DELETE CASCADE,
    INDEX idx_variation_attributes (product_variation_id, attribute_id, attribute_value_id) -- Proper index definition
);