CREATE TABLE IF NOT EXISTS variation_attributes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  variation_id INT NOT NULL,
  attribute_id INT NOT NULL,
  attribute_value_id INT NOT NULL, -- Ensure this column exists
  FOREIGN KEY (variation_id) REFERENCES product_variations(id) ON DELETE CASCADE,
  FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE,
  FOREIGN KEY (attribute_value_id) REFERENCES attribute_values(id) ON DELETE CASCADE
);

-- Drop the value_id column if it exists
ALTER TABLE variation_attributes
DROP COLUMN IF EXISTS value_id;