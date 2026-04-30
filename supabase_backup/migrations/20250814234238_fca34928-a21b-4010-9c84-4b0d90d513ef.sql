-- Create hero_images table for persistent storage
CREATE TABLE public.hero_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.hero_images ENABLE ROW LEVEL SECURITY;

-- Create policies for admins
CREATE POLICY "Admins can manage hero images"
  ON public.hero_images
  FOR ALL
  USING (is_admin_user(auth.uid()));

-- Public can read active hero images
CREATE POLICY "Public can view active hero images"
  ON public.hero_images
  FOR SELECT
  USING (is_active = true);

-- Create updated_at trigger
CREATE TRIGGER update_hero_images_updated_at
  BEFORE UPDATE ON public.hero_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default hero image
INSERT INTO public.hero_images (image_url, alt_text, title, subtitle, is_active)
VALUES (
  '/assets/images/home_page_image.webp',
  'Chapeau artisanal et sac traditionnel fait main - Artisanat authentique du Rif',
  'Artisanat Authentique du Rif',
  'Chapeau tressé et sac naturel - Fait main avec amour',
  true
);

-- Create hero_images storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('hero-images', 'hero-images', true);