-- Update product 1 images to use actual existing images from storage
-- Using images from product-1 folder or other available images

UPDATE public.products 
SET images = ARRAY[
  'https://xcvlijchkmhjonhfildm.supabase.co/storage/v1/object/public/product-images/product-1-1757007430236-49v3kthx8ai.jpg'
]
WHERE id = 1;