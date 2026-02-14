-- Deactivate the uploaded hero image so the original fallback image is used
UPDATE public.hero_images SET is_active = false WHERE id = '4a3ccdff-69db-424c-9ba8-7d3b5cf347b3';