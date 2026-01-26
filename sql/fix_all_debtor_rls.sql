-- COMPLETE RLS FIX FOR DEBTOR PORTAL
-- Run this ENTIRE script in Supabase SQL Editor
-- This fixes: Payment uploads, Profile picture update, Loans viewing

-- =====================================================
-- STEP 1: CLEAN UP ALL DUPLICATE POLICIES
-- =====================================================

-- Payment uploads policies
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'payment_uploads'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON payment_uploads', pol.policyname);
    END LOOP;
END $$;

-- =====================================================
-- STEP 2: ENSURE RLS IS ENABLED
-- =====================================================

ALTER TABLE payment_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: CREATE PAYMENT_UPLOADS POLICIES
-- =====================================================

-- Debtors can INSERT their own uploads
CREATE POLICY "payment_uploads_insert_own"
ON payment_uploads
FOR INSERT
TO authenticated
WITH CHECK (debtor_id = auth.uid());

-- Debtors can SELECT their own uploads  
CREATE POLICY "payment_uploads_select_own"
ON payment_uploads
FOR SELECT
TO authenticated
USING (debtor_id = auth.uid());

-- Staff can do everything
CREATE POLICY "payment_uploads_staff_all"
ON payment_uploads
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'finance_manager', 'ops_officer')
    )
);

-- =====================================================
-- STEP 4: FIX LOANS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Debtors view own loans" ON loans;
DROP POLICY IF EXISTS "Staff manage loans" ON loans;

-- Debtors can view their own loans
CREATE POLICY "loans_select_own"
ON loans
FOR SELECT
TO authenticated
USING (debtor_id = auth.uid());

-- Staff can manage all loans
CREATE POLICY "loans_staff_all"
ON loans
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'finance_manager', 'ops_officer', 'risk_officer')
    )
);

-- =====================================================
-- STEP 5: FIX USERS TABLE UPDATE
-- =====================================================

DROP POLICY IF EXISTS "Users update self" ON users;
DROP POLICY IF EXISTS "Authenticated users update self" ON users;

-- Users can update their own profile
CREATE POLICY "users_update_own"
ON users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- =====================================================
-- STEP 6: VERIFY ALL POLICIES
-- =====================================================

SELECT tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename IN ('payment_uploads', 'loans', 'users')
ORDER BY tablename, policyname;

-- =====================================================
-- STEP 7: STORAGE BUCKET SETUP (MANUAL STEP)
-- =====================================================
-- 
-- Go to Supabase Dashboard -> Storage -> mstreetstorage
-- Click "Policies" tab and add these:
--
-- POLICY 1 (INSERT):
--   Name: "Allow authenticated uploads"
--   Allowed operation: INSERT  
--   Target roles: authenticated
--   WITH CHECK expression: true
--
-- POLICY 2 (SELECT):
--   Name: "Allow authenticated reads"
--   Allowed operation: SELECT
--   Target roles: authenticated
--   USING expression: true
--
-- POLICY 3 (UPDATE):
--   Name: "Allow authenticated updates"  
--   Allowed operation: UPDATE
--   Target roles: authenticated
--   USING expression: true
--
-- OR run this SQL for storage (try this first):

INSERT INTO storage.buckets (id, name, public)
VALUES ('mstreetstorage', 'mstreetstorage', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Make bucket public (simplest solution for file access)
UPDATE storage.buckets SET public = true WHERE id = 'mstreetstorage';
