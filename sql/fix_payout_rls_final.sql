-- ==============================================================================
-- FINAL SECURITY RESTORATION: Payout Requests
-- ==============================================================================

-- 1. Re-Enable RLS
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential conflicting policies
DROP POLICY IF EXISTS "Creditors view own payouts" ON payout_requests;
DROP POLICY IF EXISTS "Creditors can view their own requests" ON payout_requests;

-- 3. Re-Apply Creditor View Policy
CREATE POLICY "Creditors can view their own requests" ON payout_requests
FOR SELECT
USING (
    auth.uid() = creditor_id
);

-- 4. Verify Policy Existence (Output for verification if run in SQL editor)
SELECT * FROM pg_policies WHERE tablename = 'payout_requests';
