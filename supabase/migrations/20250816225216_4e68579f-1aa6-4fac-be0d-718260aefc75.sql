-- Create product images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 
  'product-images', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
);

-- Create RLS policies for product images bucket
CREATE POLICY "Product images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'product-images' 
  AND (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()))
);

CREATE POLICY "Admins can update product images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'product-images' 
  AND (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()))
);

CREATE POLICY "Admins can delete product images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'product-images' 
  AND (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()))
);