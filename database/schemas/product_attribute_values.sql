CREATE TABLE IF NOT EXISTS product_attribute_values (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_attribute_id INT NOT NULL,
  attribute_value_id INT NOT NULL,
  FOREIGN KEY (product_attribute_id) REFERENCES product_attributes(id) ON DELETE CASCADE,
  FOREIGN KEY (attribute_value_id) REFERENCES attribute_values(id) ON DELETE CASCADE
);
