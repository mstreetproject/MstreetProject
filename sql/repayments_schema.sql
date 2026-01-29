-- LOAN REPAYMENTS SCHEMA
-- Tracks individual repayment transactions for loans

-- 1. Create the loan_repayments table
CREATE TABLE IF NOT EXISTS loan_repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
    amount_principal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    amount_interest DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15, 2) GENERATED ALWAYS AS (amount_principal + amount_interest) STORED,
    payment_type VARCHAR(20) NOT NULL DEFAULT 'full' CHECK (payment_type IN ('full', 'partial')),
    notes TEXT,
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add tracking columns to loans table for repayment progress
ALTER TABLE loans ADD COLUMN IF NOT EXISTS amount_repaid DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS interest_repaid DECIMAL(15, 2) DEFAULT 0;

-- 3. Enable RLS on loan_repayments
ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for loan_repayments

-- Staff can manage all repayments
CREATE POLICY "repayments_staff_all"
ON loan_repayments
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'finance_manager', 'ops_officer')
    )
);

-- Debtors can view repayments on their own loans
CREATE POLICY "repayments_debtor_view"
ON loan_repayments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM loans l
        WHERE l.id = loan_repayments.loan_id
        AND l.debtor_id = auth.uid()
    )
);

-- 5. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_created_at ON loan_repayments(created_at DESC);

-- 6. Verify the schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'loan_repayments'
ORDER BY ordinal_position;
