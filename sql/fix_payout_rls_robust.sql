-- ==============================================================================
-- ROBUST SECURITY RESTORATION: Payout Requests
-- ==============================================================================

-- 1. Ensure RLS is Enabled
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- 2. Grant basic permissions to authenticated users
GRANT SELECT, INSERT ON payout_requests TO authenticated;

-- 3. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Creditors view own payouts" ON payout_requests;
DROP POLICY IF EXISTS "Creditors can view their own requests" ON payout_requests;
DROP POLICY IF EXISTS "Staff can view all requests" ON payout_requests;

-- 4. Create Policy: Creditors (View Own)
-- using simple comparison. Cast to uuid to be safe if types differ.
CREATE POLICY "Creditors can view their own requests" ON payout_requests
FOR SELECT
USING (
    auth.uid() = creditor_id
);

-- 5. Create Policy: Creditors (Insert Own)
DROP POLICY IF EXISTS "Creditors can insert requests" ON payout_requests;
CREATE POLICY "Creditors can insert requests" ON payout_requests
FOR INSERT
WITH CHECK (
    auth.uid() = creditor_id
);

-- 6. Create Policy: Staff (View All) - using standard helper function
CREATE POLICY "Staff can view all requests" ON payout_requests
FOR SELECT
USING (
    has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer'])
);

-- 7. Verification: Check policies
SELECT * FROM pg_policies WHERE tablename = 'payout_requests';
