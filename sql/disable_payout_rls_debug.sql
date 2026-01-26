-- ==============================================================================
-- DEBUG: DISABLE RLS on payout_requests
-- ==============================================================================

ALTER TABLE payout_requests DISABLE ROW LEVEL SECURITY;

-- Verify it's disabled (Optional output)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'payout_requests';
