import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from './useUser';

export interface MyPayoutRequest {
    id: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected' | 'processed';
    created_at: string;
    notes?: string;
    credit: {
        id: string;
        borrower: {
            full_name: string;
        };
    };
    [key: string]: any;
}

export function useMyPayoutRequests() {
    const { user } = useUser();
    const [requests, setRequests] = useState<MyPayoutRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchRequests = async () => {
            setLoading(true);
            try {
                console.log('Fetching my payout requests (Join Restored) for:', user.id);

                // Use robust join logic
                const { data, error } = await supabase
                    .from('payout_requests')
                    .select(`
                        *,
                        credit:credits!credit_id(
                            id,
                            principal
                        )
                    `)
                    .eq('creditor_id', user.id)
                    .order('created_at', { ascending: false });

                console.log('Payout Requests Result:', { data, error });

                if (error) throw error;
                setRequests(data || []);
            } catch (err) {
                console.error('Error fetching my payout requests:', err);
                // Keep existing data or clear? Better to show empty on error for now or handle gracefully
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();

        // Realtime subscription
        const channel = supabase
            .channel(`my_payout_requests_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'payout_requests',
                    filter: `creditor_id=eq.${user.id}`
                },
                () => {
                    fetchRequests();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return { requests, loading };
}
