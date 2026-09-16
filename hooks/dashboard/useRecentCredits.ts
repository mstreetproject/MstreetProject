'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Credit } from '@/types/dashboard';

export function useRecentCredits(limit: number = 10) {
    const [credits, setCredits] = useState<Credit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchCredits() {
            try {
                setLoading(true);
                setError(null);

                const supabase = createClient();

                const { data, error: fetchError } = await supabase
                    .from('credits')
                    .select(`
            *,
            creditor:users!creditor_id (
              full_name,
              email
            )
          `)
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (fetchError) throw fetchError;

                setCredits(data || []);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch credits'));
            } finally {
                setLoading(false);
            }
        }

        fetchCredits();
    }, [limit]);

    return { credits, loading, error };
}
