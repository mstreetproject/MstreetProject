'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Loan {
    id: string;
    principal: number;
    interest_rate: number;
    tenure_months: number;
    start_date: string;
    end_date: string;
    status: 'active' | 'repaid' | 'overdue' | 'defaulted';
    created_at: string;
}

interface DebtorLoanStats {
    totalLoans: number;
    activeLoans: number;
    totalBorrowed: number;
    totalOutstanding: number;
    repaidAmount: number;
    overdueAmount: number;
}

export function useDebtorLoans() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchLoans = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            console.log('[useDebtorLoans] Auth user:', user?.id, user?.email);
            if (!user) throw new Error('Not authenticated');

            // Fetch loans for current debtor
            const { data, error: fetchError } = await supabase
                .from('loans')
                .select('*')
                .eq('debtor_id', user.id)
                .order('created_at', { ascending: false });

            console.log('[useDebtorLoans] Loans query result:', {
                debtor_id: user.id,
                data,
                error: fetchError
            });

            if (fetchError) throw fetchError;
            setLoans(data || []);
        } catch (err) {
            console.error('[useDebtorLoans] Error:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch loans'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLoans();
    }, [fetchLoans]);

    // Calculate stats from loans
    const stats = useMemo<DebtorLoanStats>(() => {
        const active = loans.filter(l => l.status === 'active');
        const repaid = loans.filter(l => l.status === 'repaid');
        const overdue = loans.filter(l => l.status === 'overdue');
        const defaulted = loans.filter(l => l.status === 'defaulted');

        const activeValue = active.reduce((sum, l) => sum + Number(l.principal), 0);
        const overdueValue = overdue.reduce((sum, l) => sum + Number(l.principal), 0);
        const repaidValue = repaid.reduce((sum, l) => sum + Number(l.principal), 0);
        const totalBorrowed = loans.reduce((sum, l) => sum + Number(l.principal), 0);

        return {
            totalLoans: loans.length,
            activeLoans: active.length,
            totalBorrowed,
            totalOutstanding: activeValue + overdueValue,
            repaidAmount: repaidValue,
            overdueAmount: overdueValue,
        };
    }, [loans]);

    return {
        loans,
        stats,
        loading,
        error,
        refetch: fetchLoans,
    };
}
