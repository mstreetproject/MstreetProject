-- CRITICAL FIX: Guarantor Submissions Public Access
-- Run this in Supabase SQL Editor

-- The issue: Anonymous users cannot update guarantor_submissions
-- because RLS policies are blocking the UPDATE operation

-- Step 1: Drop ALL existing policies for guarantor_submissions
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'guarantor_submissions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON guarantor_submissions', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Recreate policies

-- Authenticated users (debtors) can create
CREATE POLICY "gs_debtor_insert"
ON guarantor_submissions FOR INSERT TO authenticated
WITH CHECK (debtor_id = auth.uid());

-- Authenticated users (debtors) can view their own
CREATE POLICY "gs_debtor_select"
ON guarantor_submissions FOR SELECT TO authenticated
USING (debtor_id = auth.uid());

-- Staff can do everything
CREATE POLICY "gs_staff_all"
ON guarantor_submissions FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'finance_manager', 'ops_officer')
    )
);

-- CRITICAL: Anonymous users can SELECT (to load the form)
CREATE POLICY "gs_anon_select"
ON guarantor_submissions FOR SELECT TO anon
USING (true);

-- CRITICAL: Anonymous users can UPDATE (to submit the form)
CREATE POLICY "gs_anon_update"
ON guarantor_submissions FOR UPDATE TO anon
USING (true)
WITH CHECK (true);

-- Verify
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'guarantor_submissions';
