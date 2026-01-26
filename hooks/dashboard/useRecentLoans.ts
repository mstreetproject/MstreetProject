'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loan } from '@/types/dashboard';

export function useRecentLoans(limit: number = 10) {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchLoans() {
            try {
                setLoading(true);
                setError(null);

                const supabase = createClient();

                const { data, error: fetchError } = await supabase
                    .from('loans')
                    .select(`
            *,
            debtor:users!debtor_id (
              full_name,
              email
            )
          `)
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (fetchError) throw fetchError;

                setLoans(data || []);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch loans'));
            } finally {
                setLoading(false);
            }
        }

        fetchLoans();
    }, [limit]);

    return { loans, loading, error };
}
