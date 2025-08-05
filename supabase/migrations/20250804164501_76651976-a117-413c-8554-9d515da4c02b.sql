-- Create products table
CREATE TABLE public.products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  details TEXT NOT NULL,
  care TEXT NOT NULL,
  is_new BOOLEAN DEFAULT false,
  artisan TEXT NOT NULL,
  artisan_story TEXT,
  related_products INTEGER[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read products (public catalog)
CREATE POLICY "Products are publicly readable" 
ON public.products 
FOR SELECT 
USING (true);

-- Only authenticated users can modify products (admin functionality)
CREATE POLICY "Only authenticated users can insert products" 
ON public.products 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Only authenticated users can update products" 
ON public.products 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Only authenticated users can delete products" 
ON public.products 
FOR DELETE 
TO authenticated
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert existing product data
INSERT INTO public.products (id, name, price, images, category, description, details, care, is_new, artisan, artisan_story, related_products) VALUES
(1, 'Chapeau de Paille Berbère', 89.99, ARRAY['/assets/images/products/chapeau_de_paille_berbere.jpg'], 'Chapeaux', 'Un magnifique chapeau de paille artisanal berbère, tissé à la main avec des fibres naturelles. Ce chapeau traditionnel offre une protection solaire optimale tout en ajoutant une touche d''élégance à votre style.', 'Matériau: Paille naturelle berbère\nTaille: Ajustable (circonférence 56-58 cm)\nStyle: Traditionnel berbère\nCouleur: Naturel avec motifs traditionnels\nFabrication: 100% artisanale', 'Nettoyage à sec uniquement. Éviter l''exposition prolongée à l''humidité. Ranger dans un endroit sec et aéré.', true, 'Fatima Amellal', 'Fatima Amellal perpétue l''art ancestral du tissage berbère dans les montagnes de l''Atlas. Chaque chapeau raconte l''histoire de sa région et de sa culture.', ARRAY[2]),
(2, 'Sac à Main Tissé Traditionnel', 129.99, ARRAY['/assets/images/products/sac_a_main_tisse_traditionnel.jpg'], 'Sacs', 'Sac à main élégant tissé selon les techniques traditionnelles berbères. Parfait pour le quotidien, il allie fonctionnalité et esthétique authentique.', 'Matériau: Fibres végétales et cuir\nDimensions: 35cm x 25cm x 15cm\nFermeture: Zip intérieur et bouton magnétique\nDoublure: Coton naturel\nAnses: Cuir véritable', 'Nettoyer avec un chiffon humide. Éviter les produits chimiques. Traiter le cuir avec un produit adapté si nécessaire.', false, 'Ahmed Bouazza', 'Ahmed Bouazza maîtrise l''art du tissage depuis plus de 30 ans. Ses créations mélangent tradition et modernité avec un savoir-faire exceptionnel.', ARRAY[1]);

-- Reset sequence to continue from correct number
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));