-- =====================================================
-- FIX BAD DEBTS RLS POLICY
-- Allow staff to view and manage bad_debts
-- =====================================================

-- Enable RLS
ALTER TABLE bad_debts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Staff manage bad_debts" ON bad_debts;
DROP POLICY IF EXISTS "Staff view bad_debts" ON bad_debts;
DROP POLICY IF EXISTS "Allow all authenticated" ON bad_debts;

-- Create a simple policy to allow all authenticated users to view
-- (You can restrict this later if needed)
CREATE POLICY "Allow authenticated users to view bad_debts" ON bad_debts
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create policy for staff to manage (insert/update/delete)
CREATE POLICY "Staff manage bad_debts" ON bad_debts
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'finance_manager', 'ops_officer', 'risk_officer')
    )
);

-- Verify policies
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'bad_debts';

-- Verify data exists
SELECT * FROM bad_debts;

SELECT 'Bad debts RLS fixed!' as status;
