-- Update product 1 images with existing images from storage
UPDATE public.products 
SET images = ARRAY[
  'https://xcvlijchkmhjonhfildm.supabase.co/storage/v1/object/public/product-images/product-1-1757007430236-2uwbbd060kz.jpg',
  'https://xcvlijchkmhjonhfildm.supabase.co/storage/v1/object/public/product-images/product-1756898270197-3utiodgac7a.jpg'
]
WHERE id = 1;