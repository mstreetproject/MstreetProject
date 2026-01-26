-- ==============================================================================
-- PERMISSIVE SECURITY RESTORATION: Payout Requests
-- ==============================================================================
-- The user requested to simplify the RLS and rely on filtering.
-- This policy allows ANY authenticated user to SELECT records.
-- Data privacy is delegated to the specific query filters in the application.

-- 1. Ensure RLS is Enabled (to block public/anon access)
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- 2. Drop all previous restrictive policies
DROP POLICY IF EXISTS "Creditors view own payouts" ON payout_requests;
DROP POLICY IF EXISTS "Creditors can view their own requests" ON payout_requests;
DROP POLICY IF EXISTS "Staff can view all requests" ON payout_requests;
DROP POLICY IF EXISTS "Creditors can insert requests" ON payout_requests;

-- 3. Create Permissive SELECT Policy
-- Allows any logged-in user to read the table.
-- The App must strictly filter by creditor_id.
CREATE POLICY "Allow Authenticated Select" ON payout_requests
FOR SELECT
TO authenticated
USING (true);

-- 4. Restore Insert Policy (Strict)
-- We still want to ensure users can only create requests for themselves
CREATE POLICY "Creditors can insert requests" ON payout_requests
FOR INSERT
WITH CHECK (
    auth.uid() = creditor_id
);

-- 5. Staff Update Policy (Optional, if needed for approvals)
DROP POLICY IF EXISTS "Staff can update requests" ON payout_requests;
CREATE POLICY "Staff can update requests" ON payout_requests
FOR UPDATE
USING (
   has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer'])
);
