-- =====================================================
-- FIX LOANS TABLE RLS POLICIES
-- Allow staff to update loan status
-- =====================================================

-- Enable RLS on loans table
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Staff manage loans" ON loans;
DROP POLICY IF EXISTS "Staff can update loans" ON loans;
DROP POLICY IF EXISTS "Staff can view loans" ON loans;
DROP POLICY IF EXISTS "Debtors view own loans" ON loans;

-- Policy: Staff can do everything with loans
CREATE POLICY "Staff manage loans" ON loans
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'finance_manager', 'ops_officer', 'risk_officer')
    )
);

-- Policy: Debtors can view their own loans
CREATE POLICY "Debtors view own loans" ON loans
FOR SELECT USING (
    debtor_id = auth.uid()
);

-- Also fix bad_debts table policies
ALTER TABLE bad_debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage bad_debts" ON bad_debts;

CREATE POLICY "Staff manage bad_debts" ON bad_debts
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'finance_manager', 'ops_officer')
    )
);

-- Verify policies
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('loans', 'bad_debts')
ORDER BY tablename, policyname;

SELECT 'RLS policies updated for loans and bad_debts tables!' as status;
