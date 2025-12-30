-- Fix corrupted cart data: cap all quantities to 10 (the business rule max)
UPDATE cart_items 
SET quantity = 10 
WHERE quantity > 10;

-- Add a check constraint to prevent quantities above reasonable limit in the future
-- Using 100 as database-level hard limit (business rules can set lower limits)
ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_quantity_limit 
CHECK (quantity >= 1 AND quantity <= 100);

-- Log this fix
INSERT INTO audit_logs (action, resource_type, resource_id, new_values)
VALUES (
  'CART_DATA_SANITIZATION',
  'cart_items',
  'bulk_fix',
  jsonb_build_object(
    'fix', 'Capped all cart quantities to max 10 and added database constraint',
    'timestamp', now()
  )
);