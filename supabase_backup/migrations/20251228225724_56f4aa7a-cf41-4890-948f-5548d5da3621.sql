-- Fix inverted categories for products
UPDATE products SET category = 'Sacs' WHERE id = 1;
UPDATE products SET category = 'Chapeaux' WHERE id = 2;