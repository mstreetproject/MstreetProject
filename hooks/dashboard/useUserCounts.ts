'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface UserCounts {
    totalUsers: number;
    internalCount: number;
    activeInternalCount: number;
    creditorCount: number;
    debtorCount: number;
}

export function useUserCounts() {
    const [counts, setCounts] = useState<UserCounts>({
        totalUsers: 0,
        internalCount: 0,
        activeInternalCount: 0,
        creditorCount: 0,
        debtorCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchCounts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const supabase = createClient();

            // Run count queries in parallel
            const [
                { count: total },
                { count: internal },
                { count: activeInternal },
                { count: creditor },
                { count: debtor }
            ] = await Promise.all([
                supabase.from('users').select('*', { count: 'exact', head: true }),
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_internal', true),
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_internal', true).eq('email_activated', true),
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_creditor', true),
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_debtor', true)
            ]);

            setCounts({
                totalUsers: total || 0,
                internalCount: internal || 0,
                activeInternalCount: activeInternal || 0,
                creditorCount: creditor || 0,
                debtorCount: debtor || 0
            });

        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch user counts'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);

    return { counts, loading, error, refetch: fetchCounts };
}
