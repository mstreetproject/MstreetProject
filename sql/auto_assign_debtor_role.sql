-- AUTO ASSIGN DEBTOR ROLE TRIGGER
-- Run this script to update the user creation trigger so that ALL new public signups
-- are automatically assigned the 'debtor' role (is_debtor = TRUE).

-- 1. Update the function to set is_debtor = TRUE
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
  
  -- Insert the new user into public.users with is_debtor = TRUE
  INSERT INTO public.users (id, full_name, email, is_internal, is_debtor, email_activated)
  VALUES (
    new.id,
    new_full_name,
    new.email,
    FALSE,  -- Public signups are never internal by default
    TRUE,   -- <--- CHANGED: Automatically assign Debtor role
    COALESCE(new.email_confirmed_at IS NOT NULL, FALSE)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    -- Maintain is_debtor status if it's already set, otherwise set it to TRUE if we want to enforce it even on updates (optional, keeping it simple here)
    -- effectively we just want to ensure the record exists.
    full_name = CASE 
      WHEN public.users.full_name = '' OR public.users.full_name IS NULL 
      THEN EXCLUDED.full_name 
      ELSE public.users.full_name 
    END;
  
  RETURN new;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Email already exists - update instead
    UPDATE public.users 
    SET id = new.id, is_debtor = TRUE -- Ensure they become a debtor if they link up
    WHERE email = new.email;
    RETURN new;
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: % (SQLSTATE: %)', new.email, SQLERRM, SQLSTATE;
    RETURN new;
END;
$$;

-- 2. Ensure permissions are correct (re-apply just in case)
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 3. Backfill existing users? 
-- Uncomment the following lines if you want to make ALL existing non-internal users debtors
-- UPDATE public.users SET is_debtor = TRUE WHERE is_internal = FALSE;
