'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { OperatingExpense } from '@/types/dashboard';

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

// Initial simple typs
export interface ExpenseStats {
    totalCount: number;
    totalValue: number;
    averageValue: number;
    highestValue: number;
}

// Extended type for internal use with joined data
interface ExpenseWithUser extends OperatingExpense {
    users?: {
        full_name: string;
    } | null;
}

export interface DateRange {
    startDate: Date | null;
    endDate: Date | null;
}

interface UseExpenseStatsResult {
    stats: ExpenseStats;
    expenses: any[]; // Using any to avoid strict typing issues with the joined 'users' property for now
    loading: boolean;
    error: Error | null;
    timePeriod: TimePeriod;
    setTimePeriod: (period: TimePeriod) => void;
    dateRange: DateRange;
    setDateRange: (range: DateRange) => void;
    refetch: () => void;
}

export function useExpenseStats(initialPeriod: TimePeriod = 'month'): UseExpenseStatsResult {
    const [allExpenses, setAllExpenses] = useState<ExpenseWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [timePeriod, setTimePeriod] = useState<TimePeriod>(initialPeriod);
    const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });

    const fetchExpenses = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const supabase = createClient();

            const { data, error: fetchError } = await supabase
                .from('operating_expenses')
                .select('*, users(full_name)')
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            setAllExpenses(data || []);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch expenses'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    // Filter expenses based on time period and date range
    const filteredExpenses = useMemo(() => {
        let filtered = [...allExpenses];

        // Filter by custom date range (takes precedence over time period)
        if (dateRange.startDate || dateRange.endDate) {
            filtered = filtered.filter(expense => {
                const expenseDate = new Date(expense.created_at);
                if (dateRange.startDate && expenseDate < dateRange.startDate) return false;
                if (dateRange.endDate && expenseDate > dateRange.endDate) return false;
                return true;
            });
        } else if (timePeriod !== 'all') {
            // Filter by time period preset
            const daysAgo = TIME_PERIODS[timePeriod].days;
            const filterDate = new Date();
            filterDate.setDate(filterDate.getDate() - daysAgo);
            filtered = filtered.filter(expense => new Date(expense.created_at) >= filterDate);
        }

        return filtered;
    }, [allExpenses, timePeriod, dateRange]);

    // Calculate stats
    const stats = useMemo<ExpenseStats>(() => {
        const totalCount = filteredExpenses.length;
        const totalValue = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const averageValue = totalCount > 0 ? totalValue / totalCount : 0;
        const highestValue = filteredExpenses.reduce((max, e) => Math.max(max, Number(e.amount)), 0);

        return {
            totalCount,
            totalValue,
            averageValue,
            highestValue,
        };
    }, [filteredExpenses]);

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
        expenses: filteredExpenses,
        loading,
        error,
        timePeriod,
        setTimePeriod: handleSetTimePeriod,
        dateRange,
        setDateRange: handleSetDateRange,
        refetch: fetchExpenses,
    };
}
