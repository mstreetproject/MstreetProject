-- FIX CORRUPTED CREDIT DATA
-- The previous payout function wasn't reducing remaining_principal correctly
-- This script fixes the existing data

-- Step 1: Get the actual principal amounts paid out from creditor_payouts table
-- and recalculate remaining_principal

-- First, let's see what's in creditor_payouts for each credit
SELECT 
    credit_id,
    SUM(principal_amount) as total_principal_paid,
    SUM(interest_amount) as total_interest_paid,
    SUM(total_amount) as total_paid,
    COUNT(*) as payout_count
FROM creditor_payouts
GROUP BY credit_id;

-- Step 2: Fix remaining_principal by subtracting actual principal payouts
UPDATE credits c
SET remaining_principal = c.principal - COALESCE(
    (SELECT SUM(principal_amount) FROM creditor_payouts cp WHERE cp.credit_id = c.id),
    0
);

-- Step 3: Fix total_paid_out to be the sum of all payouts
UPDATE credits c
SET total_paid_out = COALESCE(
    (SELECT SUM(total_amount) FROM creditor_payouts cp WHERE cp.credit_id = c.id),
    0
);

-- Step 4: Fix status - if remaining_principal is 0 or less, mark as withdrawn
UPDATE credits
SET status = 'withdrawn'
WHERE remaining_principal <= 0 AND status != 'withdrawn';

-- Step 5: Verify the fix
SELECT 
    c.id,
    c.principal,
    c.remaining_principal,
    c.total_paid_out,
    c.status,
    COALESCE(
        (SELECT SUM(principal_amount) FROM creditor_payouts cp WHERE cp.credit_id = c.id),
        0
    ) as actual_principal_paid
FROM credits c
ORDER BY c.created_at DESC
LIMIT 15;
