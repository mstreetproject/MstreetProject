'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Credit } from '@/types/dashboard';

// Time period options
export const TIME_PERIODS = {
    week: { label: 'This Week', days: 7 },
    month: { label: 'This Month', days: 30 },
    '3months': { label: '3 Months', days: 90 },
    '6months': { label: '6 Months', days: 180 },
    year: { label: 'This Year', days: 365 },
    all: { label: 'All Time', days: 0 },
} as const;

export type TimePeriod = keyof typeof TIME_PERIODS;

export interface CreditorInfo {
    id: string;
    full_name: string;
    email: string;
}

export interface CreditorStats {
    totalCreditors: number;
    activeCount: number;
    activeValue: number;
    maturedCount: number;
    maturedValue: number;
    paidOutCount: number;
    paidOutValue: number;
    totalValue: number;
    interestAccrued: number;
}

export interface DateRange {
    startDate: Date | null;
    endDate: Date | null;
}

interface UseCreditorStatsResult {
    stats: CreditorStats;
    credits: Credit[];
    creditors: CreditorInfo[];
    loading: boolean;
    error: Error | null;
    timePeriod: TimePeriod;
    setTimePeriod: (period: TimePeriod) => void;
    dateRange: DateRange;
    setDateRange: (range: DateRange) => void;
    selectedCreditor: string | null;
    setSelectedCreditor: (creditorId: string | null) => void;
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

export function useCreditorStats(initialPeriod: TimePeriod = 'month'): UseCreditorStatsResult {
    const [allCredits, setAllCredits] = useState<Credit[]>([]);
    const [creditors, setCreditors] = useState<CreditorInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [timePeriod, setTimePeriod] = useState<TimePeriod>(initialPeriod);
    const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
    const [selectedCreditor, setSelectedCreditor] = useState<string | null>(null);

    const fetchCredits = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const supabase = createClient();

            // Fetch all creditors (users with is_creditor = true)
            const { data: creditorsData, error: creditorsError } = await supabase
                .from('users')
                .select('id, full_name, email')
                .eq('is_creditor', true)
                .order('full_name');

            if (creditorsError) throw creditorsError;
            setCreditors(creditorsData || []);

            // Fetch all credits with creditor info
            const { data, error: fetchError } = await supabase
                .from('credits')
                .select(`
                    *,
                    creditor:users!creditor_id (
                        id,
                        full_name,
                        email
                    )
                `)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            setAllCredits(data || []);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch credits'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCredits();
    }, [fetchCredits]);

    // Filter credits based on time period, date range, and creditor
    const filteredCredits = useMemo(() => {
        let filtered = [...allCredits];

        // Filter by selected creditor
        if (selectedCreditor) {
            filtered = filtered.filter(c => c.creditor_id === selectedCreditor);
        }

        // Filter by custom date range (takes precedence over time period)
        if (dateRange.startDate || dateRange.endDate) {
            filtered = filtered.filter(credit => {
                const creditDate = new Date(credit.start_date);
                if (dateRange.startDate && creditDate < dateRange.startDate) return false;
                if (dateRange.endDate && creditDate > dateRange.endDate) return false;
                return true;
            });
        } else if (timePeriod !== 'all') {
            // Filter by time period preset
            const daysAgo = TIME_PERIODS[timePeriod].days;
            const filterDate = new Date();
            filterDate.setDate(filterDate.getDate() - daysAgo);
            filterDate.setHours(0, 0, 0, 0); // Start of day
            filtered = filtered.filter(credit => new Date(credit.start_date) >= filterDate);
        }

        return filtered;
    }, [allCredits, timePeriod, dateRange, selectedCreditor]);

    // Calculate stats from filtered credits
    const stats = useMemo<CreditorStats>(() => {
        // Unique creditors in filtered data
        const uniqueCreditors = new Set(filteredCredits.map(c => c.creditor_id));

        // Filter by status
        const active = filteredCredits.filter(c => c.status === 'active');
        const matured = filteredCredits.filter(c => c.status === 'matured');
        const paidOut = filteredCredits.filter(c => c.status === 'withdrawn');

        // Calculate values
        const activeValue = active.reduce((sum, c) => sum + Number(c.principal), 0);
        const maturedValue = matured.reduce((sum, c) => sum + Number(c.principal), 0);
        const paidOutValue = paidOut.reduce((sum, c) => sum + Number(c.principal), 0);
        const totalValue = activeValue + maturedValue + paidOutValue;

        // Calculate interest accrued (for all active credits)
        const interestAccrued = active.reduce((sum, c) => {
            return sum + calculateInterestAccrued(
                Number(c.principal),
                Number(c.interest_rate),
                c.start_date,
                null // Calculate up to today
            );
        }, 0);

        return {
            totalCreditors: uniqueCreditors.size,
            activeCount: active.length,
            activeValue,
            maturedCount: matured.length,
            maturedValue,
            paidOutCount: paidOut.length,
            paidOutValue,
            totalValue,
            interestAccrued,
        };
    }, [filteredCredits]);

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
        credits: filteredCredits,
        creditors,
        loading,
        error,
        timePeriod,
        setTimePeriod: handleSetTimePeriod,
        dateRange,
        setDateRange: handleSetDateRange,
        selectedCreditor,
        setSelectedCreditor,
        refetch: fetchCredits,
    };
}

export function getTimePeriodOptions() {
    return Object.entries(TIME_PERIODS).map(([key, value]) => ({
        value: key as TimePeriod,
        label: value.label,
    }));
}
