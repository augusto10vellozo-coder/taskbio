INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE id = 'eebff9a7-058f-42fc-b707-659efaadd185'::uuid
  AND lower(email) = 'augusto10vellozo@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;