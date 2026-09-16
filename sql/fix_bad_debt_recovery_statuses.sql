-- =====================================================
-- FIX: Update record_bad_debt_recovery RPC function
-- to use the standardized loan statuses:
--   performing, non_performing, full_provision, preliquidated, archived
-- Instead of legacy: defaulted, repaid
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
    -- Use standardized statuses: full_provision stays as-is for partial recovery,
    -- performing for full recovery (debt cleared)
    UPDATE loans
    SET 
        amount_repaid = v_new_repaid,
        status = CASE 
            WHEN p_full_recovery OR v_new_repaid >= principal THEN 'performing'
            ELSE 'full_provision'
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
    INSERT INTO loan_repayments (loan_id, amount_principal, notes)
    VALUES (p_loan_id, p_recovery_amount, 'Bad debt recovery');
    
    RETURN json_build_object(
        'success', true, 
        'recovered', p_recovery_amount,
        'total_recovered', v_total_recovered,
        'fully_recovered', (p_full_recovery OR v_total_recovered >= v_bad_debt.amount)
    );
END;
$$;

-- Also fix the trigger to use correct statuses
CREATE OR REPLACE FUNCTION handle_bad_debt_recovery()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_previous_repaid DECIMAL(15,2);
    v_recovery_amount DECIMAL(15,2);
BEGIN
    -- Only for full_provision loans where amount_repaid increased
    IF NEW.status = 'full_provision' AND OLD.status = 'full_provision' THEN
        v_previous_repaid := COALESCE(OLD.amount_repaid, 0);
        
        IF COALESCE(NEW.amount_repaid, 0) > v_previous_repaid THEN
            v_recovery_amount := COALESCE(NEW.amount_repaid, 0) - v_previous_repaid;
            
            UPDATE bad_debts 
            SET 
                recovered_amount = COALESCE(recovered_amount, 0) + v_recovery_amount,
                recovery_date = CURRENT_DATE,
                is_fully_recovered = (COALESCE(recovered_amount, 0) + v_recovery_amount >= amount)
            WHERE loan_id = NEW.id;
        END IF;
    END IF;
    
    -- If loan status changes FROM full_provision to performing (full recovery)
    IF OLD.status = 'full_provision' AND NEW.status = 'performing' THEN
        UPDATE bad_debts
        SET 
            recovered_amount = amount,
            recovery_date = CURRENT_DATE,
            is_fully_recovered = true
        WHERE loan_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

SELECT 'Bad debt recovery RPC updated with standardized statuses!' as status;
