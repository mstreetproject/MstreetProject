'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { OperatingExpense } from '@/types/dashboard';

export function useRecentExpenses(limit: number = 5) {
    const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchExpenses = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const supabase = createClient();

            // Fetch expenses with creator info
            const { data, error: fetchError } = await supabase
                .from('operating_expenses')
                .select(`
                    id,
                    expense_name,
                    amount,
                    expense_month,
                    created_by,
                    created_at,
                    users:created_by (
                        full_name
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (fetchError) throw fetchError;

            // Transform data to match interface
            const transformedExpenses = (data || []).map(item => ({
                ...item,
                // Make sure users relationship is handled if needed elsewhere
                users: item.users
            }));

            setExpenses(transformedExpenses as any);
        } catch (err) {
            console.error('Error fetching recent expenses:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch recent expenses'));
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    return { expenses, loading, error, refetch: fetchExpenses };
}
