-- REPAYMENT SCHEDULES SCHEMA
-- Tracks planned installments for loans

CREATE TABLE IF NOT EXISTS repayment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
    installment_no INTEGER NOT NULL,
    due_date DATE NOT NULL,
    principal_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    interest_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15, 2) GENERATED ALWAYS AS (principal_amount + interest_amount) STORED,
    status TEXT CHECK (status IN ('pending', 'paid', 'partial', 'overdue')) DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE repayment_schedules ENABLE ROW LEVEL SECURITY;

-- Staff can manage all schedules
CREATE POLICY "schedules_staff_all"
ON repayment_schedules
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'finance_manager', 'ops_officer')
    )
);

-- Debtors can view their own schedules
CREATE POLICY "schedules_debtor_view"
ON repayment_schedules
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM loans l
        WHERE l.id = repayment_schedules.loan_id
        AND l.debtor_id = auth.uid()
    )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_repayment_schedules_loan_id ON repayment_schedules(loan_id);
CREATE INDEX IF NOT EXISTS idx_repayment_schedules_due_date ON repayment_schedules(due_date);
