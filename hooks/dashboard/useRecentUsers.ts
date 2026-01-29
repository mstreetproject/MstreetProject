'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/types/dashboard';

export function useRecentUsers(limit: number = 10) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const supabase = createClient();

            const { data, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (fetchError) throw fetchError;

            setUsers(data || []);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch users'));
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    return { users, loading, error, refetch: fetchUsers };
}
