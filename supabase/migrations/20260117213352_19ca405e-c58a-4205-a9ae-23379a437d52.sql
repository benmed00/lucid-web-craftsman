-- =====================================================
-- MULTILINGUAL CONTENT ARCHITECTURE
-- Product & Blog Post Translation Tables
-- =====================================================

-- 1. Create product_translations table
CREATE TABLE public.product_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('fr', 'en', 'ar', 'es', 'de')),
  
  -- Translatable content fields
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT,
  details TEXT NOT NULL,
  care TEXT NOT NULL,
  artisan_story TEXT,
  
  -- SEO fields (translatable)
  seo_title TEXT,
  seo_description TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure one translation per locale per product
  CONSTRAINT unique_product_locale UNIQUE(product_id, locale)
);

-- 2. Create blog_post_translations table
CREATE TABLE public.blog_post_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('fr', 'en', 'ar', 'es', 'de')),
  
  -- Translatable content fields
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  
  -- SEO fields (translatable)
  seo_title TEXT,
  seo_description TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure one translation per locale per blog post
  CONSTRAINT unique_blog_post_locale UNIQUE(blog_post_id, locale)
);

-- 3. Create indexes for performance
CREATE INDEX idx_product_translations_product_id ON public.product_translations(product_id);
CREATE INDEX idx_product_translations_locale ON public.product_translations(locale);
CREATE INDEX idx_product_translations_product_locale ON public.product_translations(product_id, locale);

CREATE INDEX idx_blog_post_translations_blog_post_id ON public.blog_post_translations(blog_post_id);
CREATE INDEX idx_blog_post_translations_locale ON public.blog_post_translations(locale);
CREATE INDEX idx_blog_post_translations_post_locale ON public.blog_post_translations(blog_post_id, locale);

-- 4. Enable RLS
ALTER TABLE public.product_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_translations ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for product_translations
-- Anyone can read translations (public catalog)
CREATE POLICY "product_translations_select" ON public.product_translations
  FOR SELECT USING (true);

-- Only admins can modify translations
CREATE POLICY "product_translations_admin_insert" ON public.product_translations
  FOR INSERT WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "product_translations_admin_update" ON public.product_translations
  FOR UPDATE USING (is_admin_user(auth.uid()));

CREATE POLICY "product_translations_admin_delete" ON public.product_translations
  FOR DELETE USING (is_admin_user(auth.uid()));

-- 6. RLS Policies for blog_post_translations
-- Anyone can read published blog translations
CREATE POLICY "blog_post_translations_select" ON public.blog_post_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts bp 
      WHERE bp.id = blog_post_id 
      AND (bp.status = 'published' OR bp.author_id = auth.uid() OR is_user_admin(auth.uid()))
    )
  );

-- Only admins/authors can modify translations
CREATE POLICY "blog_post_translations_admin_insert" ON public.blog_post_translations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.blog_posts bp 
      WHERE bp.id = blog_post_id 
      AND (bp.author_id = auth.uid() OR is_user_admin(auth.uid()))
    )
  );

CREATE POLICY "blog_post_translations_admin_update" ON public.blog_post_translations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts bp 
      WHERE bp.id = blog_post_id 
      AND (bp.author_id = auth.uid() OR is_user_admin(auth.uid()))
    )
  );

CREATE POLICY "blog_post_translations_admin_delete" ON public.blog_post_translations
  FOR DELETE USING (is_user_admin(auth.uid()));

-- 7. Update timestamp trigger
CREATE OR REPLACE FUNCTION update_translation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_translations_updated_at
  BEFORE UPDATE ON public.product_translations
  FOR EACH ROW EXECUTE FUNCTION update_translation_updated_at();

CREATE TRIGGER blog_post_translations_updated_at
  BEFORE UPDATE ON public.blog_post_translations
  FOR EACH ROW EXECUTE FUNCTION update_translation_updated_at();

-- 8. Migrate existing product content as French translations
INSERT INTO public.product_translations (product_id, locale, name, description, short_description, details, care, artisan_story, seo_title, seo_description)
SELECT 
  id,
  'fr',
  name,
  description,
  short_description,
  details,
  care,
  artisan_story,
  seo_title,
  seo_description
FROM public.products;

-- 9. Migrate existing blog post content as French translations
INSERT INTO public.blog_post_translations (blog_post_id, locale, title, excerpt, content, seo_title, seo_description)
SELECT 
  id,
  'fr',
  title,
  excerpt,
  content,
  seo_title,
  seo_description
FROM public.blog_posts;