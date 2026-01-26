-- FIX: Creditor Payout RPC Function
-- The issue is that remaining_principal might be NULL, causing updates to fail silently
-- Run this in Supabase SQL Editor

-- Step 1: First, initialize remaining_principal for all credits that have NULL
UPDATE credits 
SET remaining_principal = principal 
WHERE remaining_principal IS NULL;

-- Step 2: Also initialize total_paid_out
UPDATE credits 
SET total_paid_out = 0 
WHERE total_paid_out IS NULL;

-- Step 3: Recreate the RPC function with proper NULL handling
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
    -- Get creditor and remaining principal (with fallback to principal if NULL)
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
        RAISE EXCEPTION 'Principal amount (%) exceeds remaining balance (%)', p_principal_amount, v_remaining;
    END IF;
    
    -- Insert payout record
    INSERT INTO creditor_payouts (
        credit_id, creditor_id, principal_amount, interest_amount, 
        total_amount, payout_type, notes, processed_by
    ) VALUES (
        p_credit_id, v_creditor_id, p_principal_amount, p_interest_amount,
        v_total, p_payout_type, p_notes, auth.uid()
    ) RETURNING id INTO v_payout_id;
    
    -- Update credit - IMPORTANT: Use COALESCE to handle NULL values
    UPDATE credits SET
        remaining_principal = COALESCE(remaining_principal, principal) - COALESCE(p_principal_amount, 0),
        total_paid_out = COALESCE(total_paid_out, 0) + v_total,
        status = CASE 
            WHEN COALESCE(remaining_principal, principal) - COALESCE(p_principal_amount, 0) <= 0 THEN 'withdrawn'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = p_credit_id;
    
    -- Log for debugging
    RAISE NOTICE 'Payout recorded: credit_id=%, payout_id=%, amount=%', p_credit_id, v_payout_id, v_total;
    
    RETURN v_payout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Verify the function was created
SELECT proname FROM pg_proc WHERE proname = 'record_creditor_payout';

-- Step 5: Check current state of credits
SELECT 
    id,
    principal,
    remaining_principal,
    total_paid_out,
    status
FROM credits
LIMIT 10;
