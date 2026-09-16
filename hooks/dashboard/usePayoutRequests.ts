'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/dashboard/useUser';
import { useCurrency } from '@/hooks/useCurrency';

export interface PayoutRequest {
    id: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected' | 'processed' | 'archived';
    notes: string | null;
    created_at: string;
    creditor: {
        id: string;
        full_name: string;
        email: string;
    };
    credit: {
        id: string;
        principal: number;
        remaining_principal: number;
        interest_rate: number;
        start_date: string;
    };
}

export function usePayoutRequests() {
    const { user } = useUser();
    const { formatCurrency } = useCurrency();
    const [requests, setRequests] = useState<PayoutRequest[]>([]);
    const [archivedRequests, setArchivedRequests] = useState<PayoutRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            // Join creditor (users) and credit info
            const { data, error: fetchError } = await supabase
                .from('payout_requests')
                .select(`
                    *,
                    creditor:users!creditor_id(id, full_name, email),
                    credit:credits!credit_id(id, principal, remaining_principal, interest_rate, start_date)
                `)
                .neq('status', 'archived')
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            setRequests(data as any[] || []);
        } catch (err: any) {
            console.error('Error fetching payout requests:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchArchivedRequests = useCallback(async () => {
        try {
            const supabase = createClient();
            const { data, error: fetchError } = await supabase
                .from('payout_requests')
                .select(`
                    *,
                    creditor:users!creditor_id(id, full_name, email),
                    credit:credits!credit_id(id, principal, remaining_principal, interest_rate, start_date)
                `)
                .eq('status', 'archived')
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setArchivedRequests(data as any[] || []);
        } catch (err) {
            console.error('Error fetching archived payouts:', err);
        }
    }, []);


    const approveRequest = async (request: PayoutRequest) => {
        // Optimistic Update
        setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'approved' } : r));

        try {
            const supabase = createClient();

            // 1. Call DB function to record payout (updates credit balance)
            const { data: payoutId, error: payoutError } = await supabase
                .rpc('record_creditor_payout', {
                    p_credit_id: request.credit.id,
                    p_principal_amount: request.amount, // Treating request amount as principal withdrawal
                    p_interest_amount: 0, // Simplified for now, can be enhanced
                    p_payout_type: 'partial_principal',
                    p_notes: `Approved request: ${request.notes || 'No notes'}`
                });

            if (payoutError) throw payoutError;

            // 2. Update request status
            const { error: updateError } = await supabase
                .from('payout_requests')
                .update({ status: 'approved' })
                .eq('id', request.id);

            if (updateError) throw updateError;

            // Sync
            fetchRequests();

            // --- NEW: Send Personal Notification to Creditor ---
            const { error: notifError } = await supabase
                .from('notifications')
                .insert({
                    user_id: request.creditor.id,
                    type: 'credit',
                    title: 'Payout Approved',
                    message: `Your payout request for ${formatCurrency(request.amount)} has been approved.`,
                    link: '/dashboard/creditor'
                });
            if (notifError) console.error('Error sending notification:', notifError);
            // ---------------------------------------------------

            return { success: true };
        } catch (err: any) {
            console.error('Error approving payout:', err);
            fetchRequests(); // Revert
            throw err;
        }
    };

    const rejectRequest = async (requestId: string, reason: string) => {
        // Optimistic Update
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected', notes: reason } : r));

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('payout_requests')
                .update({
                    status: 'rejected',
                    notes: reason
                })
                .eq('id', requestId);

            if (error) throw error;

            // --- NEW: Send Personal Notification to Creditor ---
            const request = requests.find(r => r.id === requestId);
            if (request) {
                const { error: notifError } = await supabase
                    .from('notifications')
                    .insert({
                        user_id: request.creditor.id,
                        type: 'credit',
                        title: 'Payout Rejected',
                        message: `Your payout request for ${formatCurrency(request.amount)} was rejected. Reason: ${reason}`,
                        link: '/dashboard/creditor'
                    });
                if (notifError) console.error('Error sending notification:', notifError);
            }
            // ---------------------------------------------------

            fetchRequests();
        } catch (err) {
            console.error('Error rejecting payout:', err);
            fetchRequests(); // Revert
            throw err;
        }
    };

    const archiveRequest = async (requestId: string) => {
        // Optimistic Update: Remove from active list
        setRequests(prev => prev.filter(r => r.id !== requestId));

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('payout_requests')
                .update({ status: 'archived' })
                .eq('id', requestId);

            if (error) throw error;

            fetchRequests();
            fetchArchivedRequests();
        } catch (err) {
            console.error('Error archiving payout:', err);
            fetchRequests();
            throw err;
        }
    };

    const restoreRequest = async (requestId: string) => {
        // Optimistic Update: Remove from archived list
        setArchivedRequests(prev => prev.filter(r => r.id !== requestId));

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('payout_requests')
                .update({ status: 'pending' })
                .eq('id', requestId);

            if (error) throw error;

            fetchRequests();
            fetchArchivedRequests();
        } catch (err) {
            fetchArchivedRequests();
            throw err;
        }
    };

    const permanentlyDeleteRequest = async (requestId: string) => {
        // Optimistic Update
        setArchivedRequests(prev => prev.filter(r => r.id !== requestId));

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('payout_requests')
                .delete()
                .eq('id', requestId);

            if (error) throw error;

            fetchArchivedRequests();
        } catch (err) {
            fetchArchivedRequests();
            throw err;
        }
    };

    useEffect(() => {
        if (user) fetchRequests();
    }, [user, fetchRequests]);

    return {
        requests,
        archivedRequests,
        loading,
        error,
        approveRequest,
        rejectRequest,
        archiveRequest,
        restoreRequest,
        permanentlyDeleteRequest,
        fetchArchivedRequests,
        refetch: fetchRequests
    };
}
