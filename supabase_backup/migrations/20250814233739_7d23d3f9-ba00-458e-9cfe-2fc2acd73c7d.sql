-- Add admin record for the current user
INSERT INTO public.admin_users (user_id, email, name, role)
VALUES ('7db6101f-eeed-4091-8b22-696d15210887', 'benyakoub.dev+rifstraw@gmail.com', 'Benyakoub Mohammed', 'admin')
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  updated_at = now();