DELIMITER //
CREATE TRIGGER update_cart_total
AFTER INSERT ON cart_items
FOR EACH ROW
BEGIN
  UPDATE carts 
  SET total_price = (
    SELECT SUM(price * quantity)
    FROM cart_items 
    WHERE cart_id = NEW.cart_id
  )
  WHERE id = NEW.cart_id;
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER update_cart_total_update
AFTER UPDATE ON cart_items
FOR EACH ROW
BEGIN
  UPDATE carts 
  SET total_price = (
    SELECT SUM(price * quantity)
    FROM cart_items 
    WHERE cart_id = NEW.cart_id
  )
  WHERE id = NEW.cart_id;
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER update_cart_total_delete
AFTER DELETE ON cart_items
FOR EACH ROW
BEGIN
  UPDATE carts 
  SET total_price = (
    SELECT IFNULL(SUM(price * quantity), 0)
    FROM cart_items 
    WHERE cart_id = OLD.cart_id
  )
  WHERE id = OLD.cart_id;
END//
DELIMITER ;