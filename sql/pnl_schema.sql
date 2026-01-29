-- PROFIT AND LOSS SCHEMA
-- Logic to calculate P&L based on existing tables

-- 1. Create RPC function for P&L Summary
CREATE OR REPLACE FUNCTION get_profit_loss_summary(
    start_date TIMESTAMP WITH TIME ZONE, 
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS JSON AS $$
DECLARE
    total_revenue DECIMAL(15, 2);
    finance_costs DECIMAL(15, 2);
    operating_expenses DECIMAL(15, 2);
    bad_debt DECIMAL(15, 2);
    net_profit DECIMAL(15, 2);
BEGIN
    -- 1. Revenue: Total Collections from Loans (Principal + Interest Repaid)
    -- Sum of 'total_amount' (amount_principal + amount_interest) from repayments
    SELECT COALESCE(SUM(amount_principal + amount_interest), 0)
    INTO total_revenue
    FROM loan_repayments
    WHERE created_at >= start_date AND created_at <= end_date;

    -- 2. Finance Costs: Total Payouts to Creditors (Principal + Interest Paid)
    -- Sum of 'total_amount' from creditor_payouts
    SELECT COALESCE(SUM(total_amount), 0)
    INTO finance_costs
    FROM creditor_payouts
    WHERE created_at >= start_date AND created_at <= end_date;

    -- 3. Operating Expenses (from operating_expenses)
    -- Sum of 'amount' from expenses recorded within the period
    -- Casting expense_month (date) to timestamp for comparison, or comparison with dates
    SELECT COALESCE(SUM(amount), 0)
    INTO operating_expenses
    FROM operating_expenses
    WHERE expense_month >= start_date::DATE AND expense_month <= end_date::DATE;

    -- 4. Bad Debt: From bad_debts table
    -- Sum of 'amount' from bad debts declared within the period
    SELECT COALESCE(SUM(amount), 0)
    INTO bad_debt
    FROM bad_debts
    WHERE declared_date >= start_date::DATE AND declared_date <= end_date::DATE;

    -- 5. Net Profit
    -- Revenue - Costs - Expenses - Bad Debt
    net_profit := total_revenue - finance_costs - operating_expenses - bad_debt;

    -- Return as JSON
    RETURN json_build_object(
        'total_revenue', total_revenue,
        'finance_costs', finance_costs,
        'operating_expenses', operating_expenses,
        'bad_debt', bad_debt,
        'net_profit', net_profit
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_profit_loss_summary TO authenticated;
