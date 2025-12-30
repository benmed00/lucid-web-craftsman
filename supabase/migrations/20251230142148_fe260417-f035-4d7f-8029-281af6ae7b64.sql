-- Fix corrupted cart data: delete items with unrealistic quantities
DELETE FROM cart_items WHERE quantity > 100;

-- Add a CHECK constraint to prevent future corruptions (max 99 per item)
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_quantity_check;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_quantity_check CHECK (quantity > 0 AND quantity <= 99);