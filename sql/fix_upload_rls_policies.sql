-- Fix RLS Policies for Debtor Portal Uploads
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. FIX PAYMENT_UPLOADS TABLE POLICIES
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE payment_uploads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Debtors view own payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Debtors create own payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff view all payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff update payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff delete payment uploads" ON payment_uploads;

-- Recreate policies
-- Debtors can view their own uploads
CREATE POLICY "Debtors view own payment uploads"
ON payment_uploads
FOR SELECT
USING (debtor_id = auth.uid());

-- Debtors can insert their own uploads
CREATE POLICY "Debtors create own payment uploads"
ON payment_uploads
FOR INSERT
WITH CHECK (debtor_id = auth.uid());

-- Staff can view all uploads
CREATE POLICY "Staff view all payment uploads"
ON payment_uploads
FOR SELECT
USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));

-- Staff can update uploads (approve/reject)
CREATE POLICY "Staff update payment uploads"
ON payment_uploads
FOR UPDATE
USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));

-- Staff can delete uploads
CREATE POLICY "Staff delete payment uploads"
ON payment_uploads
FOR DELETE
USING (has_any_role(ARRAY['super_admin', 'finance_manager']));

-- =====================================================
-- 2. FIX USERS TABLE - PROFILE PICTURE UPDATE
-- =====================================================

-- Users should be able to update their own profile_picture_url
-- The existing "Users update self" policy should handle this
-- But let's make sure it exists

DROP POLICY IF EXISTS "Users update self" ON users;

CREATE POLICY "Users update self"
ON users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- =====================================================
-- 3. STORAGE BUCKET POLICIES (Do this in Supabase Dashboard)
-- =====================================================
-- Go to Storage > mstreetstorage > Policies and add:
--
-- For SELECT (viewing files):
--   Policy: authenticated users can read
--   Expression: true (for all authenticated)
--
-- For INSERT (uploading files):
--   Policy: authenticated users can upload to their folder
--   Expression: (bucket_id = 'mstreetstorage' AND auth.role() = 'authenticated')
--
-- For UPDATE (replacing files):
--   Policy: users can update their own files
--   Expression: (bucket_id = 'mstreetstorage' AND auth.role() = 'authenticated')

-- Verify tables have RLS enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('users', 'payment_uploads', 'loans');
