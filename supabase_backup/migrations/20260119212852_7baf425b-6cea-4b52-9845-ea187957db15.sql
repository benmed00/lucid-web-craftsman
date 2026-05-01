-- Create artisans table
CREATE TABLE public.artisans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  photo_url TEXT,
  bio TEXT,
  bio_short TEXT,
  location TEXT,
  region TEXT,
  experience_years INTEGER,
  specialty TEXT,
  techniques TEXT[],
  quote TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.artisans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artisans are viewable by everyone" ON public.artisans FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage artisans" ON public.artisans FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
CREATE TRIGGER update_artisans_updated_at BEFORE UPDATE ON public.artisans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert 4 artisans
INSERT INTO public.artisans (name, slug, photo_url, bio, bio_short, location, region, experience_years, specialty, techniques, quote) VALUES
('Fatima Benmoussa', 'fatima-benmoussa', '/assets/images/artisans/fatima.webp', 'Fatima a appris l''art du tissage auprès de sa grand-mère dans les montagnes du Rif.', 'Maître tisserande du Rif avec 25 ans d''expérience.', 'Chefchaouen', 'Rif', 25, 'Tissage traditionnel', ARRAY['Tissage à la main', 'Teintures naturelles'], 'Chaque fil que je tisse porte l''histoire de mes ancêtres.'),
('Hassan El Amrani', 'hassan-el-amrani', '/assets/images/artisans/hassan.webp', 'Hassan est un maître chapelier de Marrakech spécialiste du tressage de paille.', 'Maître chapelier de Marrakech depuis 30 ans.', 'Marrakech', 'Marrakech-Safi', 30, 'Chapellerie artisanale', ARRAY['Tressage de paille', 'Finitions à la main'], 'Un chapeau bien fait protège du soleil et embellit l''âme.'),
('Aicha Ouazzani', 'aicha-ouazzani', '/assets/images/artisans/aicha.webp', 'Aicha est une brodeuse exceptionnelle de Fès avec 20 ans d''expérience.', 'Brodeuse d''exception de Fès.', 'Fès', 'Fès-Meknès', 20, 'Broderie traditionnelle', ARRAY['Broderie au fil de soie', 'Motifs géométriques'], 'La broderie est une méditation, chaque point est une prière.'),
('Mohamed Tazi', 'mohamed-tazi', '/assets/images/artisans/mohamed.webp', 'Mohamed travaille les fibres naturelles depuis son enfance à Essaouira.', 'Artisan vannerie d''Essaouira depuis 35 ans.', 'Essaouira', 'Marrakech-Safi', 35, 'Vannerie', ARRAY['Tressage de doum', 'Travail du raphia'], 'La nature nous offre tout, il suffit de savoir écouter.');

-- Add artisan_id to products
ALTER TABLE public.products ADD COLUMN artisan_id UUID REFERENCES public.artisans(id);

-- Link products to artisans
UPDATE public.products SET artisan_id = (SELECT id FROM public.artisans WHERE name = 'Fatima Benmoussa') WHERE id IN (1, 6);
UPDATE public.products SET artisan_id = (SELECT id FROM public.artisans WHERE name = 'Hassan El Amrani') WHERE id IN (2, 5, 7);
UPDATE public.products SET artisan_id = (SELECT id FROM public.artisans WHERE name = 'Aicha Ouazzani') WHERE id = 3;
UPDATE public.products SET artisan_id = (SELECT id FROM public.artisans WHERE name = 'Mohamed Tazi') WHERE id = 4;

-- Add material column
ALTER TABLE public.product_translations ADD COLUMN IF NOT EXISTS material TEXT;

-- Update French translations with material
UPDATE public.product_translations SET material = 'Fibres de palmier naturelles' WHERE product_id = 1 AND locale = 'fr';
UPDATE public.product_translations SET material = 'Paille naturelle' WHERE product_id = 2 AND locale = 'fr';
UPDATE public.product_translations SET material = 'Coton et fil de soie' WHERE product_id = 3 AND locale = 'fr';
UPDATE public.product_translations SET material = 'Doum et raphia' WHERE product_id = 4 AND locale = 'fr';
UPDATE public.product_translations SET material = 'Paille fine' WHERE product_id = 5 AND locale = 'fr';
UPDATE public.product_translations SET material = 'Fibres premium' WHERE product_id = 6 AND locale = 'fr';
UPDATE public.product_translations SET material = 'Paille toquilla' WHERE product_id = 7 AND locale = 'fr';

-- Create artisan_translations table
CREATE TABLE public.artisan_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artisan_id UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  bio TEXT,
  bio_short TEXT,
  specialty TEXT,
  quote TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(artisan_id, locale)
);

ALTER TABLE public.artisan_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artisan translations viewable" ON public.artisan_translations FOR SELECT USING (true);
CREATE POLICY "Admins manage artisan translations" ON public.artisan_translations FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Insert English artisan translations
INSERT INTO public.artisan_translations (artisan_id, locale, bio, bio_short, specialty, quote)
SELECT id, 'en', 
  'Master artisan with decades of experience in traditional craftsmanship.',
  'Expert artisan.',
  specialty,
  quote
FROM public.artisans;