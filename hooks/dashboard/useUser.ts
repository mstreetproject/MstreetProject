'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/types/dashboard';

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchUser = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const supabase = createClient();
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

            if (authError) throw authError;
            if (!authUser) {
                setUser(null);
                setLoading(false);
                return;
            }

            // Fetch user data
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (userError) {
                console.error('Error fetching user data:', userError);
                throw userError;
            }

            // Fetch user's role IDs
            const { data: userRolesData, error: userRolesError } = await supabase
                .from('user_roles')
                .select('role_id')
                .eq('user_id', authUser.id);

            if (userRolesError) {
                console.error('Error fetching user_roles:', userRolesError);
            }

            console.log('userRolesData:', userRolesData);

            // Fetch actual role details
            let roles = [];
            if (userRolesData && userRolesData.length > 0) {
                const roleIds = userRolesData.map((ur: any) => ur.role_id);
                console.log('roleIds:', roleIds);

                const { data: rolesData, error: rolesError } = await supabase
                    .from('roles')
                    .select('*')
                    .in('id', roleIds);

                if (rolesError) {
                    console.error('Error fetching roles:', rolesError);
                } else {
                    roles = rolesData || [];
                }
            }

            console.log('=== USER DATA DEBUG ===');
            console.log('userData:', userData);
            console.log('Final roles:', roles);
            console.log('Number of roles:', roles.length);
            console.log('=====================');

            setUser({
                ...userData,
                roles,
            });
        } catch (err) {
            console.error('useUser error:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch user'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    return { user, loading, error, refetch: fetchUser };
}

