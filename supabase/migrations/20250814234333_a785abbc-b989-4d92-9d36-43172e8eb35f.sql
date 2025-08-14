-- Create storage policies for hero-images bucket
CREATE POLICY "Public can view hero images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'hero-images');

CREATE POLICY "Admins can upload hero images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'hero-images' AND is_admin_user(auth.uid()));

CREATE POLICY "Admins can update hero images"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'hero-images' AND is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete hero images"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'hero-images' AND is_admin_user(auth.uid()));