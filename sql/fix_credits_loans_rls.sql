-- Fix RLS policies for credits and loans tables
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Staff manage credits" ON credits;
DROP POLICY IF EXISTS "Staff manage loans" ON loans;

-- Recreate with ops_officer included for INSERT/UPDATE/DELETE
CREATE POLICY "Staff manage credits" ON credits 
FOR ALL 
USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));

CREATE POLICY "Staff manage loans" ON loans 
FOR ALL 
USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));

-- Verify
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('credits', 'loans');
