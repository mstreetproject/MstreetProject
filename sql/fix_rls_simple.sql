-- Simple RLS Fix for Debtor Portal
-- Run this in Supabase SQL Editor

-- =====================================================
-- FIRST: Check if the user is marked as debtor
-- =====================================================
-- Replace with your user's UUID:
SELECT id, email, is_debtor FROM public.users 
WHERE id = '9055eb04-0287-416a-af2f-1a9bfa68edd8';

-- If is_debtor is FALSE, run this to fix it:
-- UPDATE public.users SET is_debtor = true WHERE id = '9055eb04-0287-416a-af2f-1a9bfa68edd8';

-- =====================================================
-- CLEAN UP ALL POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Debtors view own payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Debtors create own payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Debtors view own uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Debtors create own uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Debtors insert own uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff view all payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff update payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff delete payment uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff manage uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff manage all uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Authenticated debtors can insert uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Authenticated debtors can view own uploads" ON payment_uploads;
DROP POLICY IF EXISTS "Staff full access to uploads" ON payment_uploads;

-- =====================================================
-- CREATE SIMPLE WORKING POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE payment_uploads ENABLE ROW LEVEL SECURITY;

-- INSERT: User can insert if debtor_id matches their auth.uid()
CREATE POLICY "Insert own uploads"
ON payment_uploads
FOR INSERT
TO authenticated
WITH CHECK (debtor_id = auth.uid());

-- SELECT: User can see their own uploads
CREATE POLICY "View own uploads"
ON payment_uploads
FOR SELECT
TO authenticated
USING (debtor_id = auth.uid());

-- Staff can do everything
CREATE POLICY "Staff full access"
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
-- FIX LOANS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Debtors view own loans" ON loans;

CREATE POLICY "Debtors view own loans"
ON loans
FOR SELECT
TO authenticated
USING (
    debtor_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'finance_manager', 'ops_officer', 'risk_officer')
    )
);

-- =====================================================
-- FIX USERS TABLE UPDATE
-- =====================================================

DROP POLICY IF EXISTS "Users update self" ON users;
DROP POLICY IF EXISTS "Authenticated users update self" ON users;

CREATE POLICY "Users update self"
ON users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- =====================================================
-- VERIFY POLICIES
-- =====================================================
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE tablename IN ('payment_uploads', 'loans', 'users')
ORDER BY tablename, policyname;
