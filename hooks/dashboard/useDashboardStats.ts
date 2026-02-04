'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardStats } from '@/types/dashboard';
import { calculateSimpleInterest } from '@/lib/interest';

export function useDashboardStats(startDate?: Date | null, endDate?: Date | null) {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const supabase = createClient();

            // Prepare financial queries with date filters
            let interestQuery = supabase.from('monthly_financials').select('interest_revenue');
            let expensesQuery = supabase.from('operating_expenses').select('amount');
            let payoutsQuery = supabase.from('creditor_payouts').select('total_amount');

            // Query loan_repayments for interest income (separate from principal)
            let interestIncomeQuery = supabase.from('loan_repayments').select('amount_interest');
            // Also keep total for backward compatibility
            let revenueQuery = supabase.from('loan_repayments').select('total_amount');

            if (startDate) {
                interestQuery = interestQuery.gte('created_at', startDate.toISOString());
                expensesQuery = expensesQuery.gte('expense_month', startDate.toISOString());
                payoutsQuery = payoutsQuery.gte('created_at', startDate.toISOString());
                revenueQuery = revenueQuery.gte('created_at', startDate.toISOString());
                interestIncomeQuery = interestIncomeQuery.gte('created_at', startDate.toISOString());
            }
            if (endDate) {
                interestQuery = interestQuery.lte('created_at', endDate.toISOString());
                expensesQuery = expensesQuery.lte('expense_month', endDate.toISOString());
                payoutsQuery = payoutsQuery.lte('created_at', endDate.toISOString());
                revenueQuery = revenueQuery.lte('created_at', endDate.toISOString());
                interestIncomeQuery = interestIncomeQuery.lte('created_at', endDate.toISOString());
            }

            // Fetch all stats in parallel
            const [
                usersCount,
                activeCredits,
                activeLoans,
                badDebtLoans,
                interestRevenue,
                operatingExpenses,
                creditorPayouts,
                loanRepayments,
                interestIncomeData,
                creditsForInterest
            ] = await Promise.all([
                // Total users (Snapshot)
                supabase
                    .from('users')
                    .select('id', { count: 'exact', head: true }),

                // Active credits (Snapshot - includes active and matured as both are liabilities)
                supabase
                    .from('credits')
                    .select('principal, remaining_principal')
                    .in('status', ['active', 'matured'])
                    .is('archived_at', null),

                // Active/Performing loans (Snapshot - includes all outstanding statuses)
                supabase
                    .from('loans')
                    .select('principal, amount_repaid')
                    .in('status', ['performing', 'non_performing']),

                // Bad Debt loans (Snapshot - full_provision)
                supabase
                    .from('loans')
                    .select('principal')
                    .eq('status', 'full_provision'),

                // Interest revenue (Filtered)
                interestQuery,

                // Operating expenses (Filtered)
                expensesQuery,

                // Creditor Payouts (Filtered)
                payoutsQuery,

                // Loan Repayments (Revenue/Collections) (Filtered)
                revenueQuery,

                // Interest Income from loan repayments (Filtered)
                interestIncomeQuery,

                // Credits for interest expense calculation (Snapshot)
                supabase
                    .from('credits')
                    .select('principal, remaining_principal, interest_rate, start_date')
                    .in('status', ['active', 'matured'])
                    .is('archived_at', null)
            ]);

            // Calculate totals
            const totalUsers = usersCount.count || 0;

            const activeCreditsData = activeCredits.data || [];
            const totalActiveCreditsSum = activeCreditsData.reduce(
                (sum, credit: any) => sum + Number(credit.remaining_principal ?? credit.principal),
                0
            );

            const activeLoansData = activeLoans.data || [];
            const totalActiveLoansSum = activeLoansData.reduce(
                (sum, loan: any) => sum + (Number(loan.principal) - Number(loan.amount_repaid || 0)),
                0
            );

            const badDebtLoansData = badDebtLoans.data || [];
            const totalBadDebtSum = badDebtLoansData.reduce(
                (sum, loan) => sum + Number(loan.principal),
                0
            );

            const totalInterestEarned = (interestRevenue.data || []).reduce(
                (sum, record) => sum + Number(record.interest_revenue),
                0
            );

            const totalOperatingExpenseSum = (operatingExpenses.data || []).reduce(
                (sum, expense) => sum + Number(expense.amount),
                0
            );

            const totalCreditCost = (creditorPayouts.data || []).reduce(
                (sum, payout) => sum + Number(payout.total_amount),
                0
            );

            const totalRevenueEarned = (loanRepayments.data || []).reduce(
                (sum, repayment) => sum + Number(repayment.total_amount),
                0
            );

            // NEW ACCOUNTING CALCULATIONS (IFRS Compliant)
            // Interest Income: Sum of interest collected from loan repayments
            const interestIncome = (interestIncomeData.data || []).reduce(
                (sum, repayment: any) => sum + Number(repayment.amount_interest || 0),
                0
            );

            // Interest Expense: Accrued interest owed to creditors
            const creditsForInterestData = creditsForInterest.data || [];
            const interestExpense = creditsForInterestData.reduce((sum, credit: any) => {
                const principal = Number(credit.remaining_principal ?? credit.principal);
                const rate = Number(credit.interest_rate);
                const startDate = credit.start_date;
                return sum + calculateSimpleInterest(principal, rate, startDate);
            }, 0);

            // Net Interest Income: Interest earned minus interest owed
            const netInterestIncome = interestIncome - interestExpense;

            // Net Profit: NII minus operating expenses
            const netProfit = netInterestIncome - totalOperatingExpenseSum;

            setStats({
                totalUsers,
                totalActiveCredits: {
                    count: activeCreditsData.length,
                    sum: totalActiveCreditsSum,
                },
                totalActiveLoans: {
                    count: activeLoansData.length,
                    sum: totalActiveLoansSum,
                },
                totalInterestEarned,      // Kept for backward compat
                totalRevenueEarned,       // Gross collections
                totalOperatingExpenses: totalOperatingExpenseSum,
                totalCreditCost,          // Total payouts (legacy)
                totalBadDebt: {
                    count: badDebtLoansData.length,
                    sum: totalBadDebtSum,
                },
                // New accounting fields
                interestIncome,
                interestExpense,
                netInterestIncome,
                netProfit,
            });
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch dashboard stats'));
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { stats, loading, error, refetch: fetchStats };
}
