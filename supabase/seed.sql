-- Seed Data for Turn2Law Intern Tracker

-- 1. Create Teams
INSERT INTO public.teams (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Squad Alpha'),
  ('22222222-2222-2222-2222-222222222222', 'Squad Beta'),
  ('33333333-3333-3333-3333-333333333333', 'Squad Gamma')
ON CONFLICT (name) DO NOTHING;

-- 2. Create default Admin User in Supabase Auth
-- Email: admin@turn2law.com
-- Password: admin123 (bcrypt hash: $2a$10$tQ1243Qj1b6lEExoHw7y6ujhS.M0vR9sJd91.h0q945e43z7f6p2K)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '99999999-9999-9999-9999-999999999999',
  'authenticated',
  'authenticated',
  'admin@turn2law.com',
  '$2a$10$YkL6N0bH2tUq6n0nL7m.De8gqO3k2gBfP.h7.wU5a.vU1vU1vU1vU', -- bcrypt for 'admin123'
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"System Admin","role":"admin","must_reset_password":false}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Force profile override in case the trigger didn't execute for any reason:
INSERT INTO public.profiles (id, email, name, role, status, must_reset_password)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  'admin@turn2law.com',
  'System Admin',
  'admin',
  'active',
  false
) ON CONFLICT (id) DO UPDATE 
SET name = 'System Admin', role = 'admin', status = 'active', must_reset_password = false;
