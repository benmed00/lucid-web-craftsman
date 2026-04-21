
-- 1. Trigger to auto-sync is_available based on stock_quantity
CREATE OR REPLACE FUNCTION public.sync_product_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_available := (NEW.stock_quantity > 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_availability ON public.products;
CREATE TRIGGER trg_sync_product_availability
  BEFORE INSERT OR UPDATE OF stock_quantity ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_availability();

-- 2. Fix existing data: products with stock=0 should be unavailable
UPDATE public.products
SET is_available = false
WHERE stock_quantity <= 0 AND is_available = true;

-- 3. Generate missing slugs from product name
UPDATE public.products
SET slug = lower(
  regexp_replace(
    regexp_replace(
      translate(name, 'àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ', 'aaaeeeeiioouuycAAAPEEEIIOOUUYC'),
      '[^a-zA-Z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL OR slug = '';
