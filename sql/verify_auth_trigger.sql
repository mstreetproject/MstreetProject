-- Verify and Fix Auth User Trigger
-- Run this in Supabase SQL Editor to ensure the trigger exists

-- Step 1: Check if the trigger exists
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- Step 2: Check if the function exists
SELECT 
    proname AS function_name,
    prosrc AS function_body
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Step 3: If the trigger or function is missing, recreate them:

-- Create the function to sync auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, is_internal)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''), 
    new.email, 
    FALSE -- Force FALSE for public sign-ups
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if user already exists
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- If email already exists (duplicate), just log and continue
    RAISE NOTICE 'User with email % already exists in public.users', new.email;
    RETURN new;
  WHEN OTHERS THEN
    -- Log any other errors but don't fail the auth signup
    RAISE WARNING 'Failed to create public.users entry for %: %', new.email, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Step 4: Sync any existing auth.users that are missing from public.users
INSERT INTO public.users (id, full_name, email, is_internal)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', ''),
    au.email,
    FALSE
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify: List any auth.users still not in public.users (should be empty)
SELECT 
    au.id,
    au.email,
    au.created_at AS auth_created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
