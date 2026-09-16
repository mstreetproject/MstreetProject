-- Archive System for Loan Requests
-- Run this in Supabase SQL Editor
-- Adds soft delete with 30-day retention and restore capability

-- =====================================================
-- 1. ADD ARCHIVE COLUMNS TO LOAN_REQUESTS
-- =====================================================

ALTER TABLE loan_requests
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Create index for faster queries on archived status
CREATE INDEX IF NOT EXISTS idx_loan_requests_archived ON loan_requests(archived_at);

-- =====================================================
-- 2. ADD ARCHIVE COLUMNS TO GUARANTOR_SUBMISSIONS
-- =====================================================

ALTER TABLE guarantor_submissions
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_guarantor_archived ON guarantor_submissions(archived_at);

-- =====================================================
-- 2.5 ADD ARCHIVE COLUMNS TO PAYMENT_UPLOADS
-- =====================================================

ALTER TABLE payment_uploads
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_uploads_archived ON payment_uploads(archived_at);

-- =====================================================
-- 3. DROP EXISTING DEBTOR POLICIES AND RECREATE WITH DELETE
-- =====================================================

-- Drop existing debtor policies for loan_requests
DROP POLICY IF EXISTS "loan_requests_debtor_select" ON loan_requests;
DROP POLICY IF EXISTS "loan_requests_debtor_insert" ON loan_requests;
DROP POLICY IF EXISTS "loan_requests_debtor_delete" ON loan_requests;
DROP POLICY IF EXISTS "loan_requests_debtor_update" ON loan_requests;

-- Recreate with full CRUD including UPDATE for soft delete
-- SELECT: Debtor can see their own requests (including archived for viewing)
CREATE POLICY "loan_requests_debtor_select"
ON loan_requests FOR SELECT TO authenticated
USING (debtor_id = auth.uid());

-- INSERT: Debtor can create their own requests
CREATE POLICY "loan_requests_debtor_insert"
ON loan_requests FOR INSERT TO authenticated
WITH CHECK (debtor_id = auth.uid());

-- UPDATE: Debtor can update their own pending/rejected requests (for soft delete & edits)
CREATE POLICY "loan_requests_debtor_update"
ON loan_requests FOR UPDATE TO authenticated
USING (
    debtor_id = auth.uid()
    AND status IN ('pending', 'rejected')
)
WITH CHECK (debtor_id = auth.uid());

-- =====================================================
-- 4. DROP AND RECREATE DEBTOR POLICIES FOR GUARANTOR_SUBMISSIONS
-- =====================================================

DROP POLICY IF EXISTS "guarantor_submissions_debtor_select" ON guarantor_submissions;
DROP POLICY IF EXISTS "guarantor_submissions_debtor_insert" ON guarantor_submissions;
DROP POLICY IF EXISTS "guarantor_submissions_debtor_delete" ON guarantor_submissions;
DROP POLICY IF EXISTS "guarantor_submissions_debtor_update" ON guarantor_submissions;

-- SELECT: Debtor can see their own guarantor submissions
CREATE POLICY "guarantor_submissions_debtor_select"
ON guarantor_submissions FOR SELECT TO authenticated
USING (debtor_id = auth.uid());

-- INSERT: Debtor can create their own
CREATE POLICY "guarantor_submissions_debtor_insert"
ON guarantor_submissions FOR INSERT TO authenticated
WITH CHECK (debtor_id = auth.uid());

-- UPDATE: Debtor can update their own (for soft delete)
CREATE POLICY "guarantor_submissions_debtor_update"
ON guarantor_submissions FOR UPDATE TO authenticated
USING (debtor_id = auth.uid())
WITH CHECK (debtor_id = auth.uid());

-- DELETE: Debtor can delete their own pending/rejected guarantor links
CREATE POLICY "guarantor_submissions_debtor_delete"
ON guarantor_submissions FOR DELETE TO authenticated
USING (
    debtor_id = auth.uid()
    AND status IN ('pending', 'rejected')
);

-- =====================================================
-- 5. VERIFY STAFF POLICIES EXIST (FOR FULL ACCESS)
-- =====================================================

-- Staff policies should already exist from original schema
-- These allow super_admin/finance_manager/ops_officer full access
-- If not, uncomment below:

-- DROP POLICY IF EXISTS "loan_requests_staff_all" ON loan_requests;
-- CREATE POLICY "loan_requests_staff_all"
-- ON loan_requests FOR ALL TO authenticated
-- USING (
--     EXISTS (
--         SELECT 1 FROM user_roles ur
--         JOIN roles r ON ur.role_id = r.id
--         WHERE ur.user_id = auth.uid()
--         AND r.name IN ('super_admin', 'finance_manager', 'ops_officer')
--     )
-- );

-- =====================================================
-- 6. HELPER VIEWS WITH RLS (SECURITY INVOKER)
-- =====================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS active_loan_requests;
DROP VIEW IF EXISTS archived_loan_requests;

-- Create view for active (non-archived) requests
CREATE VIEW active_loan_requests AS
SELECT * FROM loan_requests WHERE archived_at IS NULL;

-- Set security invoker to enforce RLS
ALTER VIEW active_loan_requests SET (security_invoker = on);

-- Create view for archived requests
CREATE VIEW archived_loan_requests AS
SELECT 
    lr.*,
    u.full_name as archived_by_name,
    (NOW() - lr.archived_at) as time_archived,
    (INTERVAL '30 days' - (NOW() - lr.archived_at)) as time_until_deletion
FROM loan_requests lr
LEFT JOIN users u ON lr.archived_by = u.id
WHERE lr.archived_at IS NOT NULL;

-- Set security invoker to enforce RLS
ALTER VIEW archived_loan_requests SET (security_invoker = on);

-- Grant access to views
GRANT SELECT ON active_loan_requests TO authenticated;
GRANT SELECT ON archived_loan_requests TO authenticated;

-- Note: With security_invoker = on, the views will execute as the
-- querying user, so RLS policies on loan_requests automatically apply.
-- This means:
-- - Debtors see only their own active/archived requests
-- - Staff see all active/archived requests
-- This means:
-- - Debtors see only their own active/archived requests
-- - Staff see all active/archived requests

-- =====================================================
-- 7. NOTES
-- =====================================================
-- 
-- Soft Delete Flow:
-- 1. Set archived_at = NOW(), archived_by = user_id, archive_reason = reason
-- 2. Archived items are filtered out in normal queries
-- 3. Super admin can restore by setting archived_at = NULL
-- 4. After 30 days, a scheduled job can permanently delete
--
-- For permanent deletion after 30 days, set up a Supabase Edge Function
-- or pg_cron job to run:
-- DELETE FROM loan_requests WHERE archived_at < NOW() - INTERVAL '30 days';
