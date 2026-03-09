
-- Add photo_urls column to product_reviews
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}';

-- Create storage bucket for review photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('review-photos', 'review-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload their own review photos
CREATE POLICY "Users can upload review photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'review-photos');

-- RLS: anyone can view review photos
CREATE POLICY "Public can view review photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'review-photos');

-- RLS: users can delete their own uploads
CREATE POLICY "Users can delete own review photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'review-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
