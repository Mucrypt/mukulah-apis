-- Ensure the total_price column has the correct precision
ALTER TABLE checkouts
MODIFY COLUMN total_price DECIMAL(12,2) NOT NULL;

-- Add the payment_details column only if it doesn't exist
-- (This must be checked manually as MySQL doesn't support conditional column creation)
-- ALTER TABLE checkouts ADD COLUMN payment_details JSON AFTER payment_status;

-- Indexes already exist, no further action needed
-- idx_checkouts_user and idx_checkouts_payment_status are already defined