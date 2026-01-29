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
    performingCount: number;
    performingValue: number;
    preliquidatedCount: number;
    preliquidatedValue: number;
    nonPerformingCount: number;
    nonPerformingValue: number;
    fullProvisionCount: number;
    fullProvisionValue: number;
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

import { calculateSimpleInterest } from '@/lib/interest';

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
                    ),
                    loan_documents(is_signed)
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

        // Filter by status (performing is the new active)
        const performing = filteredLoans.filter(l => l.status === 'performing');
        const preliquidated = filteredLoans.filter(l => l.status === 'preliquidated');
        const nonPerforming = filteredLoans.filter(l => l.status === 'non_performing');
        const fullProvision = filteredLoans.filter(l => l.status === 'full_provision');

        // Calculate values - use outstanding balance (principal - amount_repaid) not full principal
        const performingValue = performing.reduce((sum, l) => {
            const outstanding = Number(l.principal) - (Number(l.amount_repaid) || 0);
            return sum + Math.max(0, outstanding);
        }, 0);
        const preliquidatedValue = preliquidated.reduce((sum, l) => sum + Number(l.principal), 0);
        const nonPerformingValue = nonPerforming.reduce((sum, l) => {
            const outstanding = Number(l.principal) - (Number(l.amount_repaid) || 0);
            return sum + Math.max(0, outstanding);
        }, 0);
        const fullProvisionValue = fullProvision.reduce((sum, l) => sum + Number(l.principal), 0);
        const totalValue = performingValue + preliquidatedValue + nonPerformingValue + fullProvisionValue;

        // Calculate interest accrued (for performing loans, based on outstanding principal)
        const interestAccrued = performing.reduce((sum, l) => {
            const outstanding = Number(l.principal) - (Number(l.amount_repaid) || 0);
            const interestAlreadyPaid = Number(l.interest_repaid) || 0;
            return sum + calculateSimpleInterest(
                outstanding, // Use outstanding balance for interest calculation
                Number(l.interest_rate),
                l.start_date
            ) - interestAlreadyPaid; // Subtract already paid interest
        }, 0);

        return {
            totalDebtors: uniqueDebtors.size,
            performingCount: performing.length,
            performingValue,
            preliquidatedCount: preliquidated.length,
            preliquidatedValue,
            nonPerformingCount: nonPerforming.length,
            nonPerformingValue,
            fullProvisionCount: fullProvision.length,
            fullProvisionValue,
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
