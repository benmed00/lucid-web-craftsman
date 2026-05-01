-- Grant super_admin role to user
INSERT INTO public.user_roles (user_id, role, granted_by)
VALUES (
  '7db6101f-eeed-4091-8b22-696d15210887'::uuid,
  'super_admin',
  '7db6101f-eeed-4091-8b22-696d15210887'::uuid
)
ON CONFLICT (user_id, role) DO NOTHING;