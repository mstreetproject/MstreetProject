'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Credit } from '@/types/dashboard';
import { calculateSimpleInterest } from '@/lib/interest';

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
    activeValue: number; // Principal only
    maturedCount: number;
    maturedValue: number;
    paidOutCount: number;
    paidOutValue: number;
    totalValue: number; // Deprecated: use totalCurrentValue or totalPrincipal
    totalPrincipal: number; // Sum of active + matured principal
    totalCurrentValue: number; // Sum of Principal + Accrued Interest for active credits
    totalMaturityValue: number; // Sum of Original Principal + Total Expected Interest
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

            // Fetch all credits with creditor info (exclude archived)
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
                .is('archived_at', null)  // Only active credits
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            // Debug: Log fetched credits to see if remaining_principal is being returned
            console.log('Fetched credits:', data?.map(c => ({
                id: c.id,
                principal: c.principal,
                remaining_principal: c.remaining_principal,
                total_paid_out: c.total_paid_out,
                status: c.status
            })));

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

    // Filter credits based on date range and creditor
    // NOTE: Shows ALL active credits by default. Time period filter removed - 
    // use custom date range for date-based filtering
    const filteredCredits = useMemo(() => {
        let filtered = [...allCredits];

        // Filter by selected creditor
        if (selectedCreditor) {
            filtered = filtered.filter(c => c.creditor_id === selectedCreditor);
        }

        // Only filter by date if custom date range is explicitly set
        if (dateRange.startDate || dateRange.endDate) {
            filtered = filtered.filter(credit => {
                const creditDate = new Date(credit.start_date);
                if (dateRange.startDate && creditDate < dateRange.startDate) return false;
                if (dateRange.endDate && creditDate > dateRange.endDate) return false;
                return true;
            });
        }
        // Time period presets no longer filter - all credits shown regardless of start date

        return filtered;
    }, [allCredits, dateRange, selectedCreditor]);

    // Calculate stats from filtered credits
    const stats = useMemo<CreditorStats>(() => {
        // Unique creditors in filtered data
        const uniqueCreditors = new Set(filteredCredits.map(c => c.creditor_id));

        // Filter by status
        const active = filteredCredits.filter(c => c.status === 'active');
        const matured = filteredCredits.filter(c => c.status === 'matured');
        const paidOut = filteredCredits.filter(c => c.status === 'withdrawn');

        // Calculate values using remaining_principal (fallback to principal for backwards compatibility)
        const activeValue = active.reduce((sum, c) => sum + Number(c.remaining_principal ?? c.principal), 0);
        const maturedValue = matured.reduce((sum, c) => sum + Number(c.remaining_principal ?? c.principal), 0);
        const paidOutValue = paidOut.reduce((sum, c) => sum + Number(c.total_paid_out ?? c.principal), 0);
        const totalPrincipal = activeValue + maturedValue;
        const totalValue = totalPrincipal; // Deprecated but kept for compatibility

        // --- NEW CALCULATIONS ---

        // 1. Total Current Value: (Remaining Principal + Accrued Interest) for all active credits
        // Note: We might want to include 'matured' credits here too if they haven't been paid out fully
        const activeAndMatured = [...active, ...matured];

        const totalCurrentValue = activeAndMatured.reduce((sum, c) => {
            const principal = Number(c.remaining_principal ?? c.principal);
            const rate = Number(c.interest_rate);
            const accruedInterest = calculateSimpleInterest(principal, rate, c.start_date);
            return sum + principal + accruedInterest;
        }, 0);

        // 2. Interest Accrued (sum of just the interest part from above)
        const interestAccrued = activeAndMatured.reduce((sum, c) => {
            const principal = Number(c.remaining_principal ?? c.principal);
            return sum + calculateSimpleInterest(
                principal,
                Number(c.interest_rate),
                c.start_date
            );
        }, 0);

        // 3. Total Maturity Value: Original Principal + (Original Principal * Rate * Tenure/12)
        // This represents the theoretical max value if held to term
        const totalMaturityValue = activeAndMatured.reduce((sum, c) => {
            const originalPrincipal = Number(c.principal);
            const rate = Number(c.interest_rate);
            const tenureMonths = Number(c.tenure_months || 0);
            const totalExpectedInterest = originalPrincipal * (rate / 100) * (tenureMonths / 12);
            return sum + originalPrincipal + totalExpectedInterest;
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
            totalPrincipal,
            totalCurrentValue,
            totalMaturityValue,
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
