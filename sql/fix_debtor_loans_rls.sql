-- Fix Loans RLS Policy for Debtors
-- Run this in Supabase SQL Editor

-- Add policy for debtors to view their own loans
CREATE POLICY "Debtors view own loans"
ON loans
FOR SELECT
USING (
    debtor_id = auth.uid() 
    OR has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer', 'risk_officer'])
);

-- Note: The "Staff manage loans" policy should already exist for INSERT/UPDATE/DELETE operations
