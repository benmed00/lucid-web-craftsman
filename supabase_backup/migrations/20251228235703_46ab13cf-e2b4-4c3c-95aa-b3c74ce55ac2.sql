-- Add includes_free_shipping to discount_coupons
ALTER TABLE public.discount_coupons 
ADD COLUMN IF NOT EXISTS includes_free_shipping boolean DEFAULT false;

-- Create a general settings table for configurable values
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for app_settings
CREATE POLICY "App settings are publicly readable"
ON public.app_settings
FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage app settings"
ON public.app_settings
FOR ALL
USING (is_admin_user(auth.uid()));

-- Insert default free shipping threshold setting
INSERT INTO public.app_settings (setting_key, setting_value, description)
VALUES ('free_shipping_threshold', '{"amount": 100, "enabled": true}'::jsonb, 'Seuil pour la livraison gratuite automatique')
ON CONFLICT (setting_key) DO NOTHING;

-- Add comment for documentation
COMMENT ON COLUMN public.discount_coupons.includes_free_shipping IS 'Whether this coupon provides free shipping';