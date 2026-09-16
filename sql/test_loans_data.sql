-- TEST DATA FOR DEBTS MANAGEMENT DASHBOARD
-- Debtor ID: b0921bfc-2949-4ca3-b19e-22f83d933136
-- RUN IN SUPABASE SQL EDITOR

-- =====================================================
-- 1. ACTIVE LOAN (no repayments yet)
-- =====================================================
INSERT INTO loans (
    id, debtor_id, principal, interest_rate, tenure_months, 
    start_date, end_date, status, amount_repaid, interest_repaid
) VALUES (
    gen_random_uuid(),
    'b0921bfc-2949-4ca3-b19e-22f83d933136',
    5000.00,      -- Principal
    12,           -- 12% annual interest
    6,            -- 6 months tenure
    NOW() - INTERVAL '30 days',  -- Started 30 days ago
    NOW() + INTERVAL '5 months', -- End date (6 months from start)
    'active',
    0,            -- No repayments yet
    0             -- No interest repaid
);

-- =====================================================
-- 2. OVERDUE LOAN (past maturity, not fully repaid)
-- =====================================================
INSERT INTO loans (
    id, debtor_id, principal, interest_rate, tenure_months, 
    start_date, end_date, status, amount_repaid, interest_repaid
) VALUES (
    gen_random_uuid(),
    'b0921bfc-2949-4ca3-b19e-22f83d933136',
    2000.00,      -- Principal
    15,           -- 15% annual interest
    1,            -- 1 month tenure (already expired!)
    NOW() - INTERVAL '45 days',  -- Started 45 days ago
    NOW() - INTERVAL '15 days',  -- End date (1 month from start - already passed!)
    'overdue',
    0,            -- Nothing repaid
    0             -- No interest repaid
);

-- =====================================================
-- 3. FULLY REPAID LOAN
-- =====================================================
INSERT INTO loans (
    id, debtor_id, principal, interest_rate, tenure_months, 
    start_date, end_date, status, amount_repaid, interest_repaid
) VALUES (
    gen_random_uuid(),
    'b0921bfc-2949-4ca3-b19e-22f83d933136',
    4000.00,      -- Principal
    8,            -- 8% annual interest
    2,            -- 2 months tenure
    NOW() - INTERVAL '90 days',  -- Started 90 days ago
    NOW() - INTERVAL '30 days',  -- End date (2 months from start - already passed)
    'repaid',
    4000.00,      -- Full principal repaid
    53.33         -- Interest repaid (8% * 4000 * 2/12)
);

-- =====================================================
-- 4. DEFAULTED LOAN (Bad Debt)
-- =====================================================
INSERT INTO loans (
    id, debtor_id, principal, interest_rate, tenure_months, 
    start_date, end_date, status, amount_repaid, interest_repaid
) VALUES (
    gen_random_uuid(),
    'b0921bfc-2949-4ca3-b19e-22f83d933136',
    2500.00,      -- Principal
    18,           -- 18% annual interest
    3,            -- 3 months tenure
    NOW() - INTERVAL '180 days', -- Started 6 months ago
    NOW() - INTERVAL '90 days',  -- End date (3 months from start - long passed)
    'defaulted',
    0,            -- Nothing recovered
    0             -- No interest recovered
);

-- =====================================================
-- VERIFY: Check all test loans
-- =====================================================
SELECT 
    id,
    principal,
    interest_rate || '%' as rate,
    tenure_months || ' mo' as tenure,
    status,
    amount_repaid,
    interest_repaid,
    start_date::date,
    end_date::date as maturity_date
FROM loans 
WHERE debtor_id = 'b0921bfc-2949-4ca3-b19e-22f83d933136'
ORDER BY status, start_date DESC;

-- =====================================================
-- EXPECTED DASHBOARD VALUES AFTER INSERT:
-- =====================================================
-- Active Loans: 1, £5,000 outstanding
-- Overdue: 1, £2,000
-- Repaid: 1, £4,053 collected
-- Bad Debt: 1, £2,500
-- Interest Accrued: ~£50 (on active loan)
