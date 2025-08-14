-- Update the existing admin record to use the correct user ID
UPDATE public.admin_users 
SET user_id = '7db6101f-eeed-4091-8b22-696d15210887', 
    name = 'Benyakoub Mohammed',
    updated_at = now()
WHERE email = 'benyakoub.dev+rifstraw@gmail.com';