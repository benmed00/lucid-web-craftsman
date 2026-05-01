-- Update product 1 to use Supabase storage URLs
UPDATE products 
SET images = ARRAY[
  'https://xcvlijchkmhjonhfildm.supabase.co/storage/v1/object/public/product-images/sac-traditionnel-1.jpg',
  'https://xcvlijchkmhjonhfildm.supabase.co/storage/v1/object/public/product-images/sac-traditionnel-2.jpg',
  'https://xcvlijchkmhjonhfildm.supabase.co/storage/v1/object/public/product-images/sac-traditionnel-3.jpg',
  'https://xcvlijchkmhjonhfildm.supabase.co/storage/v1/object/public/product-images/sac-traditionnel-4.jpg'
]
WHERE id = 1;