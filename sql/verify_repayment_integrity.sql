-- DATA INTEGRITY CHECK
-- Verify that the total repaid amounts in 'loans' table match the sum of transactions in 'loan_repayments'

WITH repayment_sums AS (
    SELECT 
        loan_id,
        SUM(amount_principal) as total_principal_tx,
        SUM(amount_interest) as total_interest_tx,
        SUM(total_amount) as total_tx
    FROM loan_repayments
    GROUP BY loan_id
)
SELECT 
    l.id as loan_id,
    l.principal,
    -- Loans table values
    l.amount_repaid as loan_principal_repaid,
    l.interest_repaid as loan_interest_repaid,
    (l.amount_repaid + l.interest_repaid) as loan_total_repaid,
    -- Transaction sums
    COALESCE(r.total_principal_tx, 0) as tx_principal_sum,
    COALESCE(r.total_interest_tx, 0) as tx_interest_sum,
    COALESCE(r.total_tx, 0) as tx_total_sum,
    -- Differences
    (l.amount_repaid - COALESCE(r.total_principal_tx, 0)) as diff_principal,
    (l.interest_repaid - COALESCE(r.total_interest_tx, 0)) as diff_interest
FROM loans l
LEFT JOIN repayment_sums r ON l.id = r.loan_id
WHERE 
    -- Show only where there is a mismatch
    (l.amount_repaid != COALESCE(r.total_principal_tx, 0)) OR
    (l.interest_repaid != COALESCE(r.total_interest_tx, 0));
