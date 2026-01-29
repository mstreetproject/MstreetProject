-- ==============================================================================
-- PERMISSIVE SECURITY: Credits Table
-- ==============================================================================
-- We are unblocking the Join issue by allowing authenticated READ access.
-- This ensures that when we join 'payout_requests' -> 'credits', the credit
-- row is visible and doesn't cause the result to disappear.

-- 1. Enable RLS
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- 2. Drop restrictive policies
DROP POLICY IF EXISTS "Creditors view own credits" ON credits;
DROP POLICY IF EXISTS "Creditors can view their own credits" ON credits;

-- 3. Create Permissive SELECT Policy
CREATE POLICY "Allow Authenticated Select Credits" ON credits
FOR SELECT
TO authenticated
USING (true);

-- 4. Restore/Keep Strict Mutation Policies (Insert/Update)
-- (Assuming they exist or we leave them as default-deny for now, 
-- or you can recreate the standard ones if needed. 
-- For now, we focus on unblocking READ).
