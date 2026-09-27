-- REPAYMENT TRANSACTIONS SCHEMA
-- Tracks individual payments made against a loan to allow for auditing and reversing.

CREATE TABLE IF NOT EXISTS repayment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
    principal_paid DECIMAL(15, 2) NOT NULL DEFAULT 0,
    interest_paid DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_paid DECIMAL(15, 2) GENERATED ALWAYS AS (principal_paid + interest_paid) STORED,
    payment_mode TEXT CHECK (payment_mode IN ('interest_only', 'capital_only', 'both', 'custom')),
    status TEXT CHECK (status IN ('successful', 'reverted')) DEFAULT 'successful',
    recorded_by UUID REFERENCES users(id),
    reverted_by UUID REFERENCES users(id),
    reverted_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_repayment_transactions 
BEFORE UPDATE ON repayment_transactions 
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS Policies
ALTER TABLE repayment_transactions ENABLE ROW LEVEL SECURITY;

-- Staff can manage all transactions
CREATE POLICY "transactions_staff_all"
ON repayment_transactions
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'finance_manager', 'ops_officer')
    )
);

-- Debtors can view their own transactions
CREATE POLICY "transactions_debtor_view"
ON repayment_transactions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM loans l
        WHERE l.id = repayment_transactions.loan_id
        AND l.debtor_id = auth.uid()
    )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_repayment_transactions_loan_id ON repayment_transactions(loan_id);
