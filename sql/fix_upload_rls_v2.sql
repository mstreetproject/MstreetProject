-- Fix RLS Policies for Debtor Uploads - DEBUGGING VERSION
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. CLEAN UP DUPLICATE POLICIES
-- =====================================================

-- Drop all existing policies on payment_uploads
DROP POLICY IF EXISTS "Debtors view own payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Debtors create own payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Debtors view own uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Debtors create own uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff view all payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff update payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff delete payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff manage uploads" ON payment_uploads;

-- =====================================================
-- 2. CREATE WORKING POLICIES
-- =====================================================

-- For debtors: Allow authenticated users who are debtors to insert
-- The key insight: Check that the inserting user IS a debtor
CREATE POLICY "Authenticated debtors can insert uploads"
ON payment_uploads
FOR INSERT
TO authenticated
WITH CHECK (
    debtor_id = auth.uid() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_debtor = true)
);

-- For debtors: Allow authenticated users to view their own
CREATE POLICY "Authenticated debtors can view own uploads"
ON payment_uploads
FOR SELECT
TO authenticated
USING (debtor_id = auth.uid());

-- Staff can do everything
CREATE POLICY "Staff full access to uploads"
ON payment_uploads
FOR ALL
TO authenticated
USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));

-- =====================================================
-- 3. FIX USERS TABLE UPDATE POLICY
-- =====================================================

DROP POLICY IF EXISTS "Users update self" ON users;

-- Allow any authenticated user to update their own record
CREATE POLICY "Authenticated users update self"
ON users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- =====================================================
-- 4. VERIFY USER IS DEBTOR
-- =====================================================
-- Run this to check if current user is marked as debtor:
-- SELECT id, email, is_debtor FROM users WHERE id = auth.uid();

-- =====================================================
-- 5. STORAGE BUCKET POLICIES
-- =====================================================
-- In Supabase Dashboard > Storage > mstreetstorage:
-- 
-- CREATE POLICY for INSERT:
--   Name: "Authenticated users can upload"
--   Allowed operation: INSERT
--   Target roles: authenticated
--   Policy definition: true
--
-- CREATE POLICY for SELECT:
--   Name: "Public can view files" OR "Authenticated users can view"
--   Allowed operation: SELECT
--   Target roles: authenticated (or public)
--   Policy definition: true

-- Show current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'payment_uploads';
