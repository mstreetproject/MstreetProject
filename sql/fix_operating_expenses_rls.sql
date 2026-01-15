-- Fix RLS Policy for operating_expenses to allow INSERTs
-- The previous policy might have been preventing INSERTs because it lacked an explicit WITH CHECK clause
-- or because the generic ALL policy can be tricky with inserts in some Supabase configurations.

-- 1. Drop the existing policy
DROP POLICY IF EXISTS "Manage expenses" ON operating_expenses;

-- 2. Re-create the policy with explicit USING and WITH CHECK clauses
-- This ensures that users with 'super_admin' or 'finance_manager' roles can:
-- SELECT, UPDATE, DELETE (via USING)
-- INSERT, UPDATE (via WITH CHECK)
CREATE POLICY "Manage expenses" ON operating_expenses 
FOR ALL 
USING (
    has_any_role(ARRAY['super_admin', 'finance_manager'])
) 
WITH CHECK (
    has_any_role(ARRAY['super_admin', 'finance_manager'])
);
