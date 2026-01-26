-- ==============================================================================
-- FIX: Enable RLS on payout_requests and add policies
-- ==============================================================================

-- 1. Ensure RLS is enabled
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Creditors can view their own requests" ON payout_requests;
DROP POLICY IF EXISTS "Staff can view all requests" ON payout_requests;
DROP POLICY IF EXISTS "Staff can update requests" ON payout_requests;

-- 3. Create Policy: Creditors View Own
CREATE POLICY "Creditors can view their own requests" ON payout_requests
FOR SELECT
USING (auth.uid() = creditor_id);

-- 4. Create Policy: Staff View All
CREATE POLICY "Staff can view all requests" ON payout_requests
FOR SELECT
USING (
  has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'admin'])
);

-- 5. Create Policy: Staff Update (Approve/Reject)
CREATE POLICY "Staff can update requests" ON payout_requests
FOR UPDATE
USING (
  has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'admin'])
);

-- 6. Create Policy: Creditors Create Requests (if not exists)
DROP POLICY IF EXISTS "Creditors can insert requests" ON payout_requests;
CREATE POLICY "Creditors can insert requests" ON payout_requests
FOR INSERT
WITH CHECK (
  auth.uid() = creditor_id
);
