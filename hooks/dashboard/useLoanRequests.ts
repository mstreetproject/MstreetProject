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
    guarantor_submissions?: GuarantorSubmission[];
}

interface GuarantorSubmission {
    id: string;
    loan_request_id: string;
    debtor_id: string;
    access_token: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    relationship: string | null;
    status: 'pending' | 'submitted' | 'verified' | 'rejected';
    selfie_url: string | null;
    id_document_url: string | null;
    admin_notes: string | null;
    created_at: string;
    submitted_at: string | null;
}

interface CreateLoanRequest {
    amount_requested: number;
    tenure_months: number;
    purpose?: string;
}

interface CreateGuarantor {
    loan_request_id: string;
    full_name?: string;
    email?: string;
    phone?: string;
    relationship?: string;
}

export function useLoanRequests() {
    const { logActivity } = useActivityLog();
    const [requests, setRequests] = useState<LoanRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error: fetchError } = await supabase
                .from('loan_requests')
                .select(`
                    *,
                    guarantor_submissions(*)
                `)
                .eq('debtor_id', user.id)
                .is('archived_at', null)  // Only fetch non-archived requests
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setRequests(data || []);
        } catch (err) {
            console.error('[useLoanRequests] Error:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const createRequest = useCallback(async (data: CreateLoanRequest) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: request, error } = await supabase
            .from('loan_requests')
            .insert({
                debtor_id: user.id,
                ...data,
            })
            .select()
            .single();

        if (error) throw error;

        await logActivity('CREATE_LOAN', 'loan', request.id, {
            amount: data.amount_requested,
            purpose: data.purpose
        });

        await fetchRequests();
        return request;
    }, [fetchRequests]);

    const addGuarantor = useCallback(async (data: CreateGuarantor) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: guarantor, error } = await supabase
            .from('guarantor_submissions')
            .insert({
                debtor_id: user.id,
                ...data,
            })
            .select()
            .single();

        if (error) throw error;
        await fetchRequests();
        return guarantor;
    }, [fetchRequests]);

    const getGuarantorLink = (accessToken: string) => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/guarantor/${accessToken}`;
        }
        return `/guarantor/${accessToken}`;
    };

    // Soft delete loan request (archive instead of permanent delete)
    const deleteLoanRequest = useCallback(async (requestId: string, reason?: string) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Soft delete: set archived_at instead of hard delete
        const { error } = await supabase
            .from('loan_requests')
            .update({
                archived_at: new Date().toISOString(),
                archived_by: user.id,
                archive_reason: reason || 'Deleted by debtor',
            })
            .eq('id', requestId)
            .eq('debtor_id', user.id);

        if (error) throw error;

        await logActivity('UPDATE_LOAN', 'loan', requestId, {
            action: 'archive',
            reason: reason || 'Deleted by debtor'
        });

        await fetchRequests();
    }, [fetchRequests]);

    const deleteGuarantor = useCallback(async (guarantorId: string) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('guarantor_submissions')
            .delete()
            .eq('id', guarantorId)
            .eq('debtor_id', user.id);

        if (error) throw error;
        await fetchRequests();
    }, [fetchRequests]);

    // Update loan request (for pending/rejected only)
    const updateRequest = useCallback(async (
        requestId: string,
        data: { amount_requested?: number; tenure_months?: number; purpose?: string }
    ) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // For rejected loans, reset status to pending for resubmission
        const { error } = await supabase
            .from('loan_requests')
            .update({
                ...data,
                status: 'pending', // Reset to pending for review
                admin_notes: null, // Clear rejection reason
                reviewed_by: null,
                reviewed_at: null,
            })
            .eq('id', requestId)
            .eq('debtor_id', user.id);

        if (error) throw error;

        await logActivity('UPDATE_LOAN', 'loan', requestId, {
            action: 'resubmit',
            changes: data
        });

        await fetchRequests();
    }, [fetchRequests]);

    return {
        requests,
        loading,
        error,
        createRequest,
        updateRequest,
        addGuarantor,
        getGuarantorLink,
        deleteLoanRequest,
        deleteGuarantor,
        refetch: fetchRequests,
    };
}
