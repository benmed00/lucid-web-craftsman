-- Add availability field distinct from is_new
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- Add shipping configuration table for regional delivery
CREATE TABLE IF NOT EXISTS shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  postal_codes JSONB NOT NULL, -- Array of postal codes or ranges
  delivery_days_min INTEGER NOT NULL DEFAULT 2,
  delivery_days_max INTEGER NOT NULL DEFAULT 5,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  free_shipping_threshold DECIMAL(10,2) DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert shipping zones
INSERT INTO shipping_zones (name, postal_codes, delivery_days_min, delivery_days_max, shipping_cost, free_shipping_threshold) VALUES
('Nantes Métropole', '["44000", "44100", "44200", "44300", "44400", "44470", "44800", "44900"]', 1, 2, 0.00, 0.00),
('France Métropolitaine', '["01000-95999"]', 2, 5, 6.95, 80.00),
('Corse', '["20000", "20100", "20200", "20300"]', 3, 7, 12.95, 120.00);

-- Enable RLS on shipping_zones
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;

-- Create policy for shipping zones
CREATE POLICY "Shipping zones are publicly readable"
ON shipping_zones FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage shipping zones"
ON shipping_zones FOR ALL
USING (is_admin_user(auth.uid()));

-- Add trigger for updated_at on shipping_zones
CREATE TRIGGER update_shipping_zones_updated_at
BEFORE UPDATE ON shipping_zones
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Update products table to ensure stock fields are properly set
UPDATE products SET 
  stock_quantity = COALESCE(stock_quantity, 10),
  min_stock_level = COALESCE(min_stock_level, 3),
  is_available = COALESCE(is_available, true)
WHERE stock_quantity IS NULL OR min_stock_level IS NULL OR is_available IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity, is_available);
CREATE INDEX IF NOT EXISTS idx_shipping_zones_postal_codes ON shipping_zones USING GIN (postal_codes);