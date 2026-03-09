CREATE INDEX IF NOT EXISTS idx_product_translations_locale_product_id
ON public.product_translations (locale, product_id);