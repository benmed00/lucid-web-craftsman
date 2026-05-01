-- Create a table for dynamic tag translations
CREATE TABLE public.tag_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_key TEXT NOT NULL UNIQUE,
  fr TEXT NOT NULL,
  en TEXT,
  ar TEXT,
  es TEXT,
  de TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tag_translations ENABLE ROW LEVEL SECURITY;

-- Create policies - everyone can read, only admins can modify
CREATE POLICY "Anyone can read tag translations" 
ON public.tag_translations 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert tag translations" 
ON public.tag_translations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update tag translations" 
ON public.tag_translations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can delete tag translations" 
ON public.tag_translations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tag_translations_updated_at
BEFORE UPDATE ON public.tag_translations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial tag translations from existing hardcoded values
INSERT INTO public.tag_translations (tag_key, fr, en, ar, es, de) VALUES
  ('Conseils', 'Conseils', 'Tips', 'نصائح', 'Consejos', 'Tipps'),
  ('Entretien', 'Entretien', 'Care', 'صيانة', 'Cuidado', 'Pflege'),
  ('Sac', 'Sac', 'Bag', 'حقيبة', 'Bolso', 'Tasche'),
  ('Fibres', 'Fibres', 'Fibers', 'ألياف', 'Fibras', 'Fasern'),
  ('Artisanat', 'Artisanat', 'Craftsmanship', 'حرفة', 'Artesanía', 'Handwerk'),
  ('Tradition', 'Tradition', 'Tradition', 'تقليد', 'Tradición', 'Tradition'),
  ('Mode', 'Mode', 'Fashion', 'موضة', 'Moda', 'Mode'),
  ('Chapeau', 'Chapeau', 'Hat', 'قبعة', 'Sombrero', 'Hut'),
  ('Paille', 'Paille', 'Straw', 'قش', 'Paja', 'Stroh'),
  ('Berbère', 'Berbère', 'Berber', 'أمازيغي', 'Bereber', 'Berber');