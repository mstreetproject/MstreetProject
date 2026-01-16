-- =====================================================
-- CREDITOR PAYOUTS SCHEMA
-- Tracks all payouts to creditors (interest, partial, full)
-- =====================================================

-- 1. CREATE CREDITOR PAYOUTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS creditor_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_id UUID REFERENCES credits(id) ON DELETE CASCADE,
    creditor_id UUID REFERENCES users(id) NOT NULL,
    
    -- Payout details
    principal_amount DECIMAL(15,2) DEFAULT 0,      -- Principal portion paid out
    interest_amount DECIMAL(15,2) DEFAULT 0,        -- Interest portion paid out
    total_amount DECIMAL(15,2) NOT NULL,            -- Total payout (principal + interest)
    
    payout_type TEXT CHECK (payout_type IN (
        'interest_only',      -- Just paying accrued interest
        'partial_principal',  -- Partial withdrawal of principal
        'full_maturity',      -- Full payout at maturity (principal + interest)
        'early_withdrawal'    -- Full payout before maturity
    )) NOT NULL,
    
    -- Metadata
    notes TEXT,
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creditor_payouts_credit ON creditor_payouts(credit_id);
CREATE INDEX IF NOT EXISTS idx_creditor_payouts_creditor ON creditor_payouts(creditor_id);
CREATE INDEX IF NOT EXISTS idx_creditor_payouts_date ON creditor_payouts(created_at);

-- =====================================================
-- 2. ADD COLUMNS TO CREDITS TABLE
-- =====================================================

-- Interest type (simple vs compound)
ALTER TABLE credits ADD COLUMN IF NOT EXISTS 
    interest_type TEXT DEFAULT 'simple' CHECK (interest_type IN ('simple', 'compound'));

-- Track remaining principal after partial withdrawals
ALTER TABLE credits ADD COLUMN IF NOT EXISTS 
    remaining_principal DECIMAL(15,2);

-- Total amount already paid out
ALTER TABLE credits ADD COLUMN IF NOT EXISTS 
    total_paid_out DECIMAL(15,2) DEFAULT 0;

-- Archive columns (matching loan_requests pattern)
ALTER TABLE credits ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE credits ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id);
ALTER TABLE credits ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Index for archived credits
CREATE INDEX IF NOT EXISTS idx_credits_archived ON credits(archived_at);

-- =====================================================
-- 3. INITIALIZE REMAINING_PRINCIPAL FOR EXISTING CREDITS
-- =====================================================

UPDATE credits 
SET remaining_principal = principal 
WHERE remaining_principal IS NULL;

-- =====================================================
-- 4. RLS POLICIES FOR CREDITOR_PAYOUTS
-- =====================================================

ALTER TABLE creditor_payouts ENABLE ROW LEVEL SECURITY;

-- Staff can manage all payouts
CREATE POLICY "Staff manage creditor_payouts" ON creditor_payouts
FOR ALL
USING (has_any_role(ARRAY['super_admin', 'finance_manager', 'ops_officer']));

-- Creditors can view their own payouts
CREATE POLICY "Creditors view own payouts" ON creditor_payouts
FOR SELECT
USING (auth.uid() = creditor_id);

-- =====================================================
-- 5. FUNCTION TO RECORD A PAYOUT
-- =====================================================

CREATE OR REPLACE FUNCTION record_creditor_payout(
    p_credit_id UUID,
    p_principal_amount DECIMAL,
    p_interest_amount DECIMAL,
    p_payout_type TEXT,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_creditor_id UUID;
    v_remaining DECIMAL;
    v_payout_id UUID;
    v_total DECIMAL;
BEGIN
    -- Get creditor and remaining principal
    SELECT creditor_id, COALESCE(remaining_principal, principal)
    INTO v_creditor_id, v_remaining
    FROM credits WHERE id = p_credit_id;
    
    IF v_creditor_id IS NULL THEN
        RAISE EXCEPTION 'Credit not found';
    END IF;
    
    -- Calculate total
    v_total := COALESCE(p_principal_amount, 0) + COALESCE(p_interest_amount, 0);
    
    -- Validate principal doesn't exceed remaining
    IF p_principal_amount > v_remaining THEN
        RAISE EXCEPTION 'Principal amount exceeds remaining balance';
    END IF;
    
    -- Insert payout record
    INSERT INTO creditor_payouts (
        credit_id, creditor_id, principal_amount, interest_amount, 
        total_amount, payout_type, notes, processed_by
    ) VALUES (
        p_credit_id, v_creditor_id, p_principal_amount, p_interest_amount,
        v_total, p_payout_type, p_notes, auth.uid()
    ) RETURNING id INTO v_payout_id;
    
    -- Update credit
    UPDATE credits SET
        remaining_principal = remaining_principal - COALESCE(p_principal_amount, 0),
        total_paid_out = COALESCE(total_paid_out, 0) + v_total,
        status = CASE 
            WHEN remaining_principal - COALESCE(p_principal_amount, 0) <= 0 THEN 'withdrawn'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = p_credit_id;
    
    RETURN v_payout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. MATURITY NOTIFICATION TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION notify_credit_maturity()
RETURNS TRIGGER AS $$
BEGIN
    -- When credit reaches maturity date and is still active
    IF NEW.end_date <= NOW() AND NEW.status = 'active' AND 
       (OLD.status != 'active' OR OLD.end_date > NOW()) THEN
        -- Notify all internal staff
        INSERT INTO notifications (user_id, title, message, type, link)
        SELECT u.id, 
               '💰 Credit Matured',
               'Credit for ' || (SELECT full_name FROM users WHERE id = NEW.creditor_id) || 
               ' has matured. Principal: ' || NEW.principal::TEXT,
               'credit_matured',
               '/dashboard/internal/creditors'
        FROM users u
        WHERE u.is_internal = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_credit_maturity ON credits;
CREATE TRIGGER trigger_credit_maturity
    AFTER UPDATE ON credits
    FOR EACH ROW
    EXECUTE FUNCTION notify_credit_maturity();

-- =====================================================
-- 7. HELPER VIEW FOR ACTIVE CREDITS WITH CALCULATIONS
-- =====================================================

DROP VIEW IF EXISTS credits_with_accrual;
CREATE VIEW credits_with_accrual AS
SELECT 
    c.*,
    u.full_name as creditor_name,
    u.email as creditor_email,
    -- Days elapsed since start
    GREATEST(0, EXTRACT(DAY FROM NOW() - c.start_date)::INTEGER) as days_elapsed,
    -- Simple interest accrued to date
    CASE WHEN c.interest_type = 'simple' THEN
        COALESCE(c.remaining_principal, c.principal) * (c.interest_rate / 100) * 
        (EXTRACT(DAY FROM NOW() - c.start_date) / 365)
    ELSE
        -- Compound interest (monthly compounding)
        COALESCE(c.remaining_principal, c.principal) * 
        (POWER(1 + (c.interest_rate / 100 / 12), 
               EXTRACT(MONTH FROM NOW() - c.start_date)::INTEGER) - 1)
    END as interest_accrued,
    -- Current total value
    COALESCE(c.remaining_principal, c.principal) + 
    CASE WHEN c.interest_type = 'simple' THEN
        COALESCE(c.remaining_principal, c.principal) * (c.interest_rate / 100) * 
        (EXTRACT(DAY FROM NOW() - c.start_date) / 365)
    ELSE
        COALESCE(c.remaining_principal, c.principal) * 
        (POWER(1 + (c.interest_rate / 100 / 12), 
               EXTRACT(MONTH FROM NOW() - c.start_date)::INTEGER) - 1)
    END as current_value,
    -- Maturity value (at end of tenure)
    COALESCE(c.remaining_principal, c.principal) + 
    COALESCE(c.remaining_principal, c.principal) * (c.interest_rate / 100) * (c.tenure_months / 12) as maturity_value,
    -- Is matured?
    c.end_date <= NOW() as is_matured
FROM credits c
LEFT JOIN users u ON c.creditor_id = u.id
WHERE c.archived_at IS NULL;

-- Grant access
GRANT SELECT ON credits_with_accrual TO authenticated;

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- Payout Flow:
-- 1. Admin selects credit and payout type
-- 2. System calculates interest accrued
-- 3. Admin confirms payout amount
-- 4. record_creditor_payout() is called
-- 5. Payout record created, credit updated
-- 6. If remaining_principal = 0, status -> 'withdrawn'
--
-- Status Flow:
-- active -> matured (when end_date passes, via UI or scheduled job)
-- active/matured -> withdrawn (when fully paid out)
