'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';

interface LoanRequest {
    id: string;
    debtor_id: string;
    amount_requested: number;
    tenure_months: number;
    purpose: string | null;
    status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'disbursed';
    reviewed_by: string | null;
    reviewed_at: string | null;
    admin_notes: string | null;
    created_at: string;
    // Archive fields
    archived_at: string | null;
    archived_by: string | null;
    archive_reason: string | null;
    // Joined data
    debtor?: {
        id: string;
        full_name: string;
        email: string;
        phone: string | null;
        profile_picture_url: string | null;
    };
    guarantor_submissions?: {
        id: string;
        full_name: string | null;
        email: string | null;
        phone: string | null;
        relationship: string | null;
        status: string;
        selfie_url: string | null;
        id_document_url: string | null;
        submitted_at: string | null;
        admin_notes: string | null;
    }[];
}

export function useAllLoanRequests() {
    const [requests, setRequests] = useState<LoanRequest[]>([]);
    const [archivedRequests, setArchivedRequests] = useState<LoanRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const { logActivity } = useActivityLog();

    // Fetch active (non-archived) requests
    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            const { data, error: fetchError } = await supabase
                .from('loan_requests')
                .select(`
                    *,
                    debtor:users!loan_requests_debtor_id_fkey(id, full_name, email, phone, profile_picture_url),
                    guarantor_submissions(*)
                `)
                .is('archived_at', null) // Only active requests
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setRequests(data || []);
        } catch (err) {
            console.error('[useAllLoanRequests] Error:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch'));
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch archived requests
    const fetchArchivedRequests = useCallback(async () => {
        try {
            const supabase = createClient();

            const { data, error: fetchError } = await supabase
                .from('loan_requests')
                .select(`
                    *,
                    debtor:users!loan_requests_debtor_id_fkey(id, full_name, email, phone, profile_picture_url),
                    guarantor_submissions(*)
                `)
                .not('archived_at', 'is', null) // Only archived requests
                .order('archived_at', { ascending: false });

            if (fetchError) throw fetchError;
            setArchivedRequests(data || []);
            return data || [];
        } catch (err) {
            console.error('[useAllLoanRequests] Fetch archived error:', err);
            throw err;
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const updateStatus = useCallback(async (
        requestId: string,
        status: 'under_review' | 'approved' | 'rejected',
        notes?: string
    ) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('loan_requests')
            .update({
                status,
                admin_notes: notes || null,
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', requestId);

        if (error) throw error;

        // Log the appropriate action based on status
        const action = status === 'approved' ? 'APPROVE_LOAN_REQUEST'
            : status === 'rejected' ? 'REJECT_LOAN_REQUEST'
                : 'UPDATE_LOAN_REQUEST';
        await logActivity(action, 'loan_request', requestId, { new_status: status, notes });

        // --- NEW: Send Personal Notification to Debtor ---
        if (status === 'approved' || status === 'rejected') {
            // Fetch request details to get debtor_id and amount
            const { data: requestData } = await supabase
                .from('loan_requests')
                .select('debtor_id, amount_requested')
                .eq('id', requestId)
                .single();

            if (requestData) {
                const { error: notifError } = await supabase
                    .from('notifications')
                    .insert({
                        user_id: requestData.debtor_id, // Target the debtor
                        type: 'loan',
                        title: `Loan Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
                        message: `Your loan request for ${requestData.amount_requested} has been ${status}.${notes ? ` Reason: ${notes}` : ''}`,
                        link: '/dashboard/debtor'
                    });

                if (notifError) console.error('Error sending notification:', notifError);
            }
        }
        // -------------------------------------------------

        await fetchRequests();
    }, [fetchRequests, logActivity]);

    const updateGuarantorStatus = useCallback(async (
        guarantorId: string,
        status: 'verified' | 'rejected',
        notes?: string
    ) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('guarantor_submissions')
            .update({
                status,
                admin_notes: notes || null,
                verified_by: user.id,
                verified_at: new Date().toISOString(),
            })
            .eq('id', guarantorId);

        if (error) throw error;
        await fetchRequests();
    }, [fetchRequests]);

    // Archive loan request (soft delete)
    const archiveRequest = useCallback(async (requestId: string, reason?: string) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('loan_requests')
            .update({
                archived_at: new Date().toISOString(),
                archived_by: user.id,
                archive_reason: reason || 'Archived by admin',
            })
            .eq('id', requestId);

        if (error) throw error;

        await logActivity('ARCHIVE_LOAN_REQUEST', 'loan_request', requestId, { reason: reason || 'Archived by admin' });

        await fetchRequests();
    }, [fetchRequests, logActivity]);

    // Restore archived request
    const restoreRequest = useCallback(async (requestId: string) => {
        const supabase = createClient();

        const { error } = await supabase
            .from('loan_requests')
            .update({
                archived_at: null,
                archived_by: null,
                archive_reason: null,
            })
            .eq('id', requestId);

        if (error) throw error;

        await logActivity('RESTORE_LOAN_REQUEST', 'loan_request', requestId, {});

        await fetchRequests();
        await fetchArchivedRequests();
    }, [fetchRequests, fetchArchivedRequests, logActivity]);

    // Permanent delete (for super_admin only, after 30 days)
    const permanentlyDeleteRequest = useCallback(async (requestId: string) => {
        const supabase = createClient();

        // Log deletion before actually deleting
        await logActivity('DELETE_LOAN_REQUEST', 'loan_request', requestId, { permanent: true });

        // First delete guarantor submissions
        await supabase
            .from('guarantor_submissions')
            .delete()
            .eq('loan_request_id', requestId);

        // Then delete the loan request
        const { error } = await supabase
            .from('loan_requests')
            .delete()
            .eq('id', requestId);

        if (error) throw error;
        await fetchArchivedRequests();
    }, [fetchArchivedRequests, logActivity]);

    return {
        requests,
        archivedRequests,
        loading,
        error,
        updateStatus,
        updateGuarantorStatus,
        archiveRequest,
        restoreRequest,
        permanentlyDeleteRequest,
        fetchArchivedRequests,
        refetch: fetchRequests,
    };
}
