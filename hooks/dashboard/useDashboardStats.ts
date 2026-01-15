'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardStats } from '@/types/dashboard';

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

            if (startDate) {
                interestQuery = interestQuery.gte('created_at', startDate.toISOString());
                expensesQuery = expensesQuery.gte('expense_month', startDate.toISOString());
            }
            if (endDate) {
                interestQuery = interestQuery.lte('created_at', endDate.toISOString());
                expensesQuery = expensesQuery.lte('expense_month', endDate.toISOString());
            }

            // Fetch all stats in parallel
            const [
                usersCount,
                activeCredits,
                activeLoans,
                badDebtLoans,
                interestRevenue,
                operatingExpenses,
            ] = await Promise.all([
                // Total users (Snapshot)
                supabase
                    .from('users')
                    .select('id', { count: 'exact', head: true }),

                // Active credits (Snapshot)
                supabase
                    .from('credits')
                    .select('principal')
                    .eq('status', 'active'),

                // Active loans (Snapshot)
                supabase
                    .from('loans')
                    .select('principal')
                    .eq('status', 'active'),

                // Bad Debt loans (Snapshot - defaulted)
                supabase
                    .from('loans')
                    .select('principal')
                    .eq('status', 'defaulted'),

                // Interest revenue (Filtered)
                interestQuery,

                // Operating expenses (Filtered)
                expensesQuery,
            ]);

            // Calculate totals
            const totalUsers = usersCount.count || 0;

            const activeCreditsData = activeCredits.data || [];
            const totalActiveCreditsSum = activeCreditsData.reduce(
                (sum, credit) => sum + Number(credit.principal),
                0
            );

            const activeLoansData = activeLoans.data || [];
            const totalActiveLoansSum = activeLoansData.reduce(
                (sum, loan) => sum + Number(loan.principal),
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
                totalInterestEarned,
                totalOperatingExpenses: totalOperatingExpenseSum,
                totalBadDebt: {
                    count: badDebtLoansData.length,
                    sum: totalBadDebtSum,
                },
            });
        } catch (err) {
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
