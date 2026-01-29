-- =====================================================
-- BAD DEBT RECOVERY MANAGEMENT
-- Handles when a defaulted loan gets partial/full payment
-- =====================================================

-- First, add a 'recovered_amount' column to bad_debts if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bad_debts' AND column_name = 'recovered_amount'
    ) THEN
        ALTER TABLE bad_debts ADD COLUMN recovered_amount DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bad_debts' AND column_name = 'recovery_date'
    ) THEN
        ALTER TABLE bad_debts ADD COLUMN recovery_date DATE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bad_debts' AND column_name = 'is_fully_recovered'
    ) THEN
        ALTER TABLE bad_debts ADD COLUMN is_fully_recovered BOOLEAN DEFAULT false;
    END IF;
END $$;

-- =====================================================
-- TRIGGER FUNCTION: Handle recovery payments
-- When a defaulted loan receives a repayment (amount_repaid changes)
-- =====================================================
CREATE OR REPLACE FUNCTION handle_bad_debt_recovery()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_previous_repaid DECIMAL(15,2);
    v_recovery_amount DECIMAL(15,2);
    v_total_recovered DECIMAL(15,2);
BEGIN
    -- Only for defaulted loans where amount_repaid increased
    IF NEW.status = 'defaulted' AND OLD.status = 'defaulted' THEN
        v_previous_repaid := COALESCE(OLD.amount_repaid, 0);
        
        -- Check if new repayment was made
        IF COALESCE(NEW.amount_repaid, 0) > v_previous_repaid THEN
            v_recovery_amount := COALESCE(NEW.amount_repaid, 0) - v_previous_repaid;
            
            -- Update bad_debts with recovery
            UPDATE bad_debts 
            SET 
                recovered_amount = COALESCE(recovered_amount, 0) + v_recovery_amount,
                recovery_date = CURRENT_DATE,
                is_fully_recovered = (COALESCE(recovered_amount, 0) + v_recovery_amount >= amount)
            WHERE loan_id = NEW.id;
            
            RAISE NOTICE 'Bad debt recovery: £% received for loan %', v_recovery_amount, NEW.id;
        END IF;
    END IF;
    
    -- If loan status changes FROM defaulted to repaid (full recovery)
    IF OLD.status = 'defaulted' AND NEW.status = 'repaid' THEN
        UPDATE bad_debts
        SET 
            recovered_amount = amount,
            recovery_date = CURRENT_DATE,
            is_fully_recovered = true
        WHERE loan_id = NEW.id;
        
        RAISE NOTICE 'Loan % fully recovered from bad debt!', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE RECOVERY TRIGGER
-- =====================================================
DROP TRIGGER IF EXISTS on_bad_debt_recovery ON loans;

CREATE TRIGGER on_bad_debt_recovery
    AFTER UPDATE OF amount_repaid, status ON loans
    FOR EACH ROW
    EXECUTE FUNCTION handle_bad_debt_recovery();

-- =====================================================
-- RPC FUNCTION: Record bad debt recovery manually
-- Call this from the UI when recording a recovery payment
-- =====================================================
CREATE OR REPLACE FUNCTION record_bad_debt_recovery(
    p_loan_id UUID,
    p_recovery_amount DECIMAL(15,2),
    p_full_recovery BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_loan RECORD;
    v_bad_debt RECORD;
    v_new_repaid DECIMAL(15,2);
    v_total_recovered DECIMAL(15,2);
BEGIN
    -- Get the loan
    SELECT * INTO v_loan FROM loans WHERE id = p_loan_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Loan not found');
    END IF;
    
    -- Get the bad_debt record
    SELECT * INTO v_bad_debt FROM bad_debts WHERE loan_id = p_loan_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Not in bad debts');
    END IF;
    
    -- Calculate new repaid amount
    v_new_repaid := COALESCE(v_loan.amount_repaid, 0) + p_recovery_amount;
    v_total_recovered := COALESCE(v_bad_debt.recovered_amount, 0) + p_recovery_amount;
    
    -- Update the loan
    UPDATE loans
    SET 
        amount_repaid = v_new_repaid,
        status = CASE 
            WHEN p_full_recovery OR v_new_repaid >= principal THEN 'repaid'
            ELSE 'defaulted'
        END
    WHERE id = p_loan_id;
    
    -- Update bad_debts
    UPDATE bad_debts
    SET 
        recovered_amount = v_total_recovered,
        recovery_date = CURRENT_DATE,
        is_fully_recovered = (p_full_recovery OR v_total_recovered >= amount)
    WHERE loan_id = p_loan_id;
    
    -- Record in loan_repayments for audit trail
    INSERT INTO loan_repayments (loan_id, total_amount, notes)
    VALUES (p_loan_id, p_recovery_amount, 'Bad debt recovery');
    
    RETURN json_build_object(
        'success', true, 
        'recovered', p_recovery_amount,
        'total_recovered', v_total_recovered,
        'fully_recovered', (p_full_recovery OR v_total_recovered >= v_bad_debt.amount)
    );
END;
$$;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'Bad debt recovery system created!' as status;

-- View bad debts with recovery status
SELECT 
    bd.loan_id,
    bd.amount as original_amount,
    bd.recovered_amount,
    bd.amount - COALESCE(bd.recovered_amount, 0) as remaining,
    bd.is_fully_recovered,
    bd.recovery_date,
    l.status as loan_status
FROM bad_debts bd
LEFT JOIN loans l ON bd.loan_id = l.id
ORDER BY bd.declared_date DESC;
