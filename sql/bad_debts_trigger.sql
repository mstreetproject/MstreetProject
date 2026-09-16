-- =====================================================
-- BAD DEBTS AUTO-INSERT TRIGGER
-- Matches existing bad_debts table structure
-- Uses principal directly (same as dashboard calculation)
-- =====================================================

-- =====================================================
-- TRIGGER FUNCTION: Auto-insert into bad_debts
-- SECURITY DEFINER allows the function to bypass RLS
-- =====================================================
CREATE OR REPLACE FUNCTION handle_loan_default()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only proceed if status is changing TO 'full_provision'
    IF NEW.status = 'full_provision' AND (OLD.status IS NULL OR OLD.status != 'full_provision') THEN
        
        -- Check if this loan is already in bad_debts
        IF NOT EXISTS (SELECT 1 FROM bad_debts WHERE loan_id = NEW.id) THEN
            -- Insert into bad_debts table
            -- Use principal directly (same as dashboard calculation)
            INSERT INTO bad_debts (
                loan_id,
                declared_date,
                amount,
                reason
            ) VALUES (
                NEW.id,
                CURRENT_DATE,
                COALESCE(NEW.principal, 0),  -- Just use principal like dashboard
                'Loan marked as non-performing (Full provision required) - auto-captured by system'
            );
            
            RAISE NOTICE 'Loan % marked as Full Provision. Amount: %', NEW.id, NEW.principal;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE TRIGGER on loans table
-- =====================================================
DROP TRIGGER IF EXISTS on_loan_default ON loans;

CREATE TRIGGER on_loan_default
    AFTER INSERT OR UPDATE OF status ON loans
    FOR EACH ROW
    EXECUTE FUNCTION handle_loan_default();

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'Trigger created. Amount = principal (matches dashboard)!' as status;

-- Check existing bad_debts:
SELECT * FROM bad_debts ORDER BY created_at DESC LIMIT 5;
