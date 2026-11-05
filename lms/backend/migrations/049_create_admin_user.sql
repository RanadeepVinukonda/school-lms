-- Migration 049: Create admin user
-- Run AFTER migration 048 in Supabase SQL Editor.
-- No credentials are seeded. Provide them with:
--   SET app.admin_email = '...'; SET app.admin_password = '...';
-- or create the admin with backend/src/scripts/createAdmin.ts.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Allow super_admin role (codebase uses it extensively)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'super_admin', 'teacher', 'student', 'parent'));

DO $$
DECLARE
  _uid UUID := gen_random_uuid();
  _now TIMESTAMPTZ := now();
  _email TEXT := current_setting('app.admin_email', true);
  _password TEXT := current_setting('app.admin_password', true);
BEGIN
  IF _email IS NULL OR _email = '' OR _password IS NULL OR _password = '' THEN
    RAISE NOTICE 'Skipping admin creation: set app.admin_email and app.admin_password';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = _email) THEN
    RAISE NOTICE 'Admin user already exists in auth.users';
    RETURN;
  END IF;

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    role, aud, confirmation_token, recovery_token, is_super_admin
  ) VALUES (
    _uid, '00000000-0000-0000-0000-000000000000',
    _email,
    crypt(_password, gen_salt('bf')),
    _now,
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Admin"}',
    _now, _now,
    'authenticated', 'authenticated',
    '', '', true
  );

  INSERT INTO users (
    id, email, display_name, role, is_active,
    phone_number, photo_url, class_ids, created_at, updated_at
  ) VALUES (
    _uid, _email, 'Admin', 'super_admin', true,
    '', '', '{}', _now, _now
  );

  RAISE NOTICE 'Admin user created (UID: %)', _uid;
END;
$$;
