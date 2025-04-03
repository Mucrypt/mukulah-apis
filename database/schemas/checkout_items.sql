CREATE TABLE checkout_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  checkout_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  quantity INT NOT NULL,
  image VARCHAR(512) NOT NULL,
  size VARCHAR(50),
  color VARCHAR(50),
  FOREIGN KEY (checkout_id) REFERENCES checkouts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Create indexes
CREATE INDEX idx_checkout_items_checkout ON checkout_items(checkout_id);
CREATE INDEX idx_checkout_items_product ON checkout_items(product_id);