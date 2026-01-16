-- Fix RLS Policies - MATCHING via EMAIL instead of direct ID
-- Run this in Supabase SQL Editor

-- The issue: auth.uid() returns the ID from auth.users table,
-- but public.users has its own separate ID column.
-- We need to match via EMAIL (which is the same in both tables)

-- =====================================================
-- 1. CREATE HELPER FUNCTION to get public.users.id from auth.uid()
-- =====================================================

CREATE OR REPLACE FUNCTION get_public_user_id()
RETURNS UUID AS $$
DECLARE
    public_id UUID;
    user_email TEXT;
BEGIN
    -- Get email from auth.users
    SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
    
    -- Find matching public.users record
    SELECT id INTO public_id FROM public.users WHERE email = user_email;
    
    RETURN public_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. FIX PAYMENT_UPLOADS POLICIES
-- =====================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Debtors view own payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Debtors create own payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Debtors view own uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Debtors create own uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff view all payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff update payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff delete payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff manage uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Authenticated debtors can insert uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Authenticated debtors can view own uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff full access to uploads" ON payment_uploads;

-- Enable RLS
ALTER TABLE payment_uploads ENABLE ROW LEVEL SECURITY;

-- Debtors can INSERT their own uploads (matching via helper function)
CREATE POLICY "Debtors insert own uploads"
ON payment_uploads
FOR INSERT
TO authenticated
WITH CHECK (debtor_id = get_public_user_id());

-- Debtors can SELECT their own uploads
CREATE POLICY "Debtors view own uploads"
ON payment_uploads
FOR SELECT
TO authenticated
USING (debtor_id = get_public_user_id());

-- Staff full access
CREATE POLICY "Staff manage all uploads"
ON payment_uploads
FOR ALL
TO authenticated
USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));

-- =====================================================
-- 3. FIX LOANS POLICIES (same issue)
-- =====================================================

DROP POLICY IF EXISTS "Debtors view own loans" ON loans;

CREATE POLICY "Debtors view own loans"
ON loans
FOR SELECT
TO authenticated
USING (debtor_id = get_public_user_id() OR has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']));

-- =====================================================
-- 4. FIX USERS TABLE UPDATE POLICY
-- =====================================================

DROP POLICY IF EXISTS "Users update self" ON users;
DROP POLICY IF EXISTS "Authenticated users update self" ON users;

-- Users update their own record (matching via email)
CREATE POLICY "Users update self"
ON users
FOR UPDATE
TO authenticated
USING (id = get_public_user_id())
WITH CHECK (id = get_public_user_id());

-- =====================================================
-- 5. VERIFY THE FUNCTION WORKS
-- =====================================================  
-- Test: SELECT get_public_user_id();
-- Should return the public.users.id for the current auth user

-- =====================================================
-- 6. STORAGE BUCKET (Do in Supabase Dashboard)
-- =====================================================
-- Go to Storage > mstreetstorage > Policies
-- Add INSERT policy: 
--   Target roles: authenticated
--   Policy: true (allow all authenticated users)
