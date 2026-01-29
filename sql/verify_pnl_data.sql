-- ===========================================
-- VERIFY AND FIX P&L REPORTS DATA
-- Run this in Supabase SQL Editor
-- ===========================================

-- Step 1: Check if required tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('loan_repayments', 'creditor_payouts', 'operating_expenses', 'loans');

-- Step 2: Check if the P&L function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'get_profit_loss_summary';

-- Step 3: Verify there's data in the tables
SELECT 
    'loan_repayments' as table_name,
    COUNT(*) as row_count,
    COALESCE(SUM(amount_interest), 0) as total_interest
FROM loan_repayments
UNION ALL
SELECT 
    'creditor_payouts',
    COUNT(*),
    COALESCE(SUM(interest_amount), 0)
FROM creditor_payouts
UNION ALL
SELECT 
    'operating_expenses',
    COUNT(*),
    COALESCE(SUM(amount), 0)
FROM operating_expenses
UNION ALL
SELECT 
    'loans (defaulted)',
    COUNT(*),
    COALESCE(SUM(principal), 0)
FROM loans
WHERE status = 'defaulted';

-- Step 4: Test the P&L function directly
SELECT * FROM get_profit_loss_summary(
    '2024-01-01'::timestamp,
    NOW()::timestamp
);
