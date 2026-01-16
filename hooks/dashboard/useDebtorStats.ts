'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loan } from '@/types/dashboard';
import { TIME_PERIODS, TimePeriod, DateRange } from './useCreditorStats';

export { TIME_PERIODS, type TimePeriod, type DateRange };

export interface DebtorInfo {
    id: string;
    full_name: string;
    email: string;
}

export interface DebtorStats {
    totalDebtors: number;
    activeCount: number;
    activeValue: number;
    repaidCount: number;
    repaidValue: number;
    overdueCount: number;
    overdueValue: number;
    badDebtCount: number;
    badDebtValue: number;
    totalValue: number;
    interestAccrued: number;
}

interface UseDebtorStatsResult {
    stats: DebtorStats;
    loans: Loan[];
    debtors: DebtorInfo[];
    loading: boolean;
    error: Error | null;
    timePeriod: TimePeriod;
    setTimePeriod: (period: TimePeriod) => void;
    dateRange: DateRange;
    setDateRange: (range: DateRange) => void;
    selectedDebtor: string | null;
    setSelectedDebtor: (debtorId: string | null) => void;
    refetch: () => void;
}

// Calculate interest accrued based on principal, rate, and time elapsed
function calculateInterestAccrued(
    principal: number,
    interestRate: number,
    startDate: string,
    endDate: string | null
): number {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const monthsElapsed = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    // Simple interest: P * R * T / 12 (annualized)
    return principal * (interestRate / 100) * (monthsElapsed / 12);
}

export function useDebtorStats(initialPeriod: TimePeriod = 'month'): UseDebtorStatsResult {
    const [allLoans, setAllLoans] = useState<Loan[]>([]);
    const [debtors, setDebtors] = useState<DebtorInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [timePeriod, setTimePeriod] = useState<TimePeriod>(initialPeriod);
    const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
    const [selectedDebtor, setSelectedDebtor] = useState<string | null>(null);

    const fetchLoans = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const supabase = createClient();

            // Fetch all loans with debtor info
            const { data, error: fetchError } = await supabase
                .from('loans')
                .select(`
                    *,
                    debtor:users!debtor_id (
                        id,
                        full_name,
                        email
                    )
                `)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            setAllLoans(data || []);

            // Extract unique debtors for the dropdown
            const uniqueDebtors = new Map<string, DebtorInfo>();
            (data || []).forEach(loan => {
                if (loan.debtor && !uniqueDebtors.has(loan.debtor.id)) {
                    uniqueDebtors.set(loan.debtor.id, {
                        id: loan.debtor.id,
                        full_name: loan.debtor.full_name,
                        email: loan.debtor.email,
                    });
                }
            });
            setDebtors(Array.from(uniqueDebtors.values()));
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch loans'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLoans();
    }, [fetchLoans]);

    // Filter loans based on time period, date range, and debtor
    const filteredLoans = useMemo(() => {
        let filtered = [...allLoans];

        // Filter by selected debtor
        if (selectedDebtor) {
            filtered = filtered.filter(l => l.debtor_id === selectedDebtor);
        }

        // Filter by custom date range (takes precedence over time period)
        if (dateRange.startDate || dateRange.endDate) {
            filtered = filtered.filter(loan => {
                const loanDate = new Date(loan.created_at);
                if (dateRange.startDate && loanDate < dateRange.startDate) return false;
                if (dateRange.endDate && loanDate > dateRange.endDate) return false;
                return true;
            });
        } else if (timePeriod !== 'all') {
            // Filter by time period preset
            const daysAgo = TIME_PERIODS[timePeriod].days;
            const filterDate = new Date();
            filterDate.setDate(filterDate.getDate() - daysAgo);
            filtered = filtered.filter(loan => new Date(loan.created_at) >= filterDate);
        }

        return filtered;
    }, [allLoans, timePeriod, dateRange, selectedDebtor]);

    // Calculate stats from filtered loans
    const stats = useMemo<DebtorStats>(() => {
        // Unique debtors in filtered data
        const uniqueDebtors = new Set(filteredLoans.map(l => l.debtor_id));

        // Filter by status (partial_repaid counts as active for tracking)
        const active = filteredLoans.filter(l => l.status === 'active' || l.status === 'partial_repaid');
        const repaid = filteredLoans.filter(l => l.status === 'repaid');
        const overdue = filteredLoans.filter(l => l.status === 'overdue');
        const badDebt = filteredLoans.filter(l => l.status === 'defaulted');

        // Calculate values - use outstanding balance (principal - amount_repaid) not full principal
        const activeValue = active.reduce((sum, l) => {
            const outstanding = Number(l.principal) - (Number(l.amount_repaid) || 0);
            return sum + Math.max(0, outstanding);
        }, 0);
        const repaidValue = repaid.reduce((sum, l) => sum + Number(l.principal), 0);
        const overdueValue = overdue.reduce((sum, l) => {
            const outstanding = Number(l.principal) - (Number(l.amount_repaid) || 0);
            return sum + Math.max(0, outstanding);
        }, 0);
        const badDebtValue = badDebt.reduce((sum, l) => sum + Number(l.principal), 0);
        const totalValue = activeValue + repaidValue + overdueValue + badDebtValue;

        // Calculate interest accrued (for active loans, based on outstanding principal)
        const interestAccrued = active.reduce((sum, l) => {
            const outstanding = Number(l.principal) - (Number(l.amount_repaid) || 0);
            const interestAlreadyPaid = Number(l.interest_repaid) || 0;
            return sum + calculateInterestAccrued(
                outstanding, // Use outstanding balance for interest calculation
                Number(l.interest_rate),
                l.start_date,
                null // Calculate up to today
            ) - interestAlreadyPaid; // Subtract already paid interest
        }, 0);

        return {
            totalDebtors: uniqueDebtors.size,
            activeCount: active.length,
            activeValue,
            repaidCount: repaid.length,
            repaidValue,
            overdueCount: overdue.length,
            overdueValue,
            badDebtCount: badDebt.length,
            badDebtValue,
            totalValue,
            interestAccrued: Math.max(0, interestAccrued), // Ensure non-negative
        };
    }, [filteredLoans]);

    // Handle time period change - clear custom date range
    const handleSetTimePeriod = useCallback((period: TimePeriod) => {
        setTimePeriod(period);
        setDateRange({ startDate: null, endDate: null });
    }, []);

    // Handle date range change - set time period to 'all' when custom range is used
    const handleSetDateRange = useCallback((range: DateRange) => {
        setDateRange(range);
        if (range.startDate || range.endDate) {
            setTimePeriod('all');
        }
    }, []);

    return {
        stats,
        loans: filteredLoans,
        debtors,
        loading,
        error,
        timePeriod,
        setTimePeriod: handleSetTimePeriod,
        dateRange,
        setDateRange: handleSetDateRange,
        selectedDebtor,
        setSelectedDebtor,
        refetch: fetchLoans,
    };
}
