-- COMPREHENSIVE FIX: Auth User Sync Trigger
-- This script fixes permission issues with the handle_new_user trigger
-- Run this ENTIRE script in Supabase SQL Editor

-- Step 1: Drop existing trigger and function (with CASCADE to handle dependencies)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Create the function with SECURITY DEFINER and proper error handling
-- SECURITY DEFINER means the function runs with the privileges of the owner (postgres)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_full_name TEXT;
BEGIN
  -- Extract full_name from metadata, default to empty string
  new_full_name := COALESCE(new.raw_user_meta_data->>'full_name', '');
  
  -- Log for debugging (check in Supabase dashboard -> Logs -> Postgres)
  RAISE LOG 'handle_new_user triggered for user: %, email: %', new.id, new.email;
  
  -- Insert the new user into public.users
  INSERT INTO public.users (id, full_name, email, is_internal, email_activated)
  VALUES (
    new.id,
    new_full_name,
    new.email,
    FALSE,
    COALESCE(new.email_confirmed_at IS NOT NULL, FALSE)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE 
      WHEN public.users.full_name = '' OR public.users.full_name IS NULL 
      THEN EXCLUDED.full_name 
      ELSE public.users.full_name 
    END;
  
  RAISE LOG 'Successfully created public.users entry for: %', new.email;
  RETURN new;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Email already exists - update instead
    RAISE LOG 'Duplicate email for user %, updating existing record', new.email;
    UPDATE public.users 
    SET id = new.id 
    WHERE email = new.email;
    RETURN new;
  WHEN OTHERS THEN
    -- Log the actual error
    RAISE WARNING 'handle_new_user failed for %: % (SQLSTATE: %)', new.email, SQLERRM, SQLSTATE;
    -- Still return new to not block auth signup
    RETURN new;
END;
$$;

-- Step 3: Grant permissions on the function
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Step 4: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Ensure the public.users table allows inserts from the trigger
-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON public.users TO postgres;

-- Step 6: Verify the trigger is properly attached
SELECT 
    t.tgname AS trigger_name,
    t.tgrelid::regclass AS table_name,
    p.proname AS function_name,
    CASE t.tgenabled
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
        WHEN 'R' THEN 'REPLICA'
        WHEN 'A' THEN 'ALWAYS'
        ELSE 'UNKNOWN'
    END AS trigger_status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- Step 7: Sync any existing auth.users that are missing from public.users
INSERT INTO public.users (id, full_name, email, is_internal, email_activated)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', ''),
    au.email,
    FALSE,
    COALESCE(au.email_confirmed_at IS NOT NULL, FALSE)
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 8: Final verification - this should return ZERO rows if everything is synced
SELECT 
    au.id,
    au.email,
    au.created_at AS auth_created,
    'MISSING from public.users' AS status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
