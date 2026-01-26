'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AuditLog } from '@/types/dashboard';

export function useAuditLogs(limit: number = 20) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchLogs() {
            try {
                setLoading(true);
                setError(null);

                const supabase = createClient();

                const { data, error: fetchError } = await supabase
                    .from('audit_logs')
                    .select(`
            *,
            user:users!user_id (
              full_name,
              email
            )
          `)
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (fetchError) throw fetchError;

                setLogs(data || []);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch audit logs'));
            } finally {
                setLoading(false);
            }
        }

        fetchLogs();
    }, [limit]);

    return { logs, loading, error };
}
