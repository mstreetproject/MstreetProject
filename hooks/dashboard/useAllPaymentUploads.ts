'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';

interface PaymentUpload {
    id: string;
    loan_id: string;
    debtor_id: string;
    file_url: string;
    file_name: string;
    amount_paid: number | null;
    payment_date: string | null;
    status: 'pending' | 'approved' | 'rejected';
    admin_notes: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
    // Archive fields
    archived_at: string | null;
    archived_by: string | null;
    archive_reason: string | null;
    // Joined data
    debtor?: {
        full_name: string;
        email: string;
    };
    loan?: {
        principal: number;
        status: string;
    };
}

export function useAllPaymentUploads() {
    const [uploads, setUploads] = useState<PaymentUpload[]>([]);
    const [archivedUploads, setArchivedUploads] = useState<PaymentUpload[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const { logActivity } = useActivityLog();

    // Fetch active (non-archived) uploads
    const fetchUploads = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            const { data, error: fetchError } = await supabase
                .from('payment_uploads')
                .select(`
                    *,
                    debtor:users!payment_uploads_debtor_id_fkey(full_name, email),
                    loan:loans!payment_uploads_loan_id_fkey(principal, status)
                `)
                .is('archived_at', null) // Only active uploads
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setUploads(data || []);
        } catch (err) {
            console.error('[useAllPaymentUploads] Error:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch uploads'));
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch archived uploads
    const fetchArchivedUploads = useCallback(async () => {
        try {
            const supabase = createClient();

            const { data, error: fetchError } = await supabase
                .from('payment_uploads')
                .select(`
                    *,
                    debtor:users!payment_uploads_debtor_id_fkey(full_name, email),
                    loan:loans!payment_uploads_loan_id_fkey(principal, status)
                `)
                .not('archived_at', 'is', null) // Only archived
                .order('archived_at', { ascending: false });

            if (fetchError) throw fetchError;
            setArchivedUploads(data || []);
            return data || [];
        } catch (err) {
            console.error('[useAllPaymentUploads] Fetch archived error:', err);
            throw err;
        }
    }, []);

    useEffect(() => {
        fetchUploads();
    }, [fetchUploads]);

    const updateStatus = useCallback(async (
        uploadId: string,
        status: 'approved' | 'rejected',
        notes?: string
    ) => {
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error: updateError } = await supabase
            .from('payment_uploads')
            .update({
                status,
                admin_notes: notes || null,
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', uploadId);

        if (updateError) throw updateError;

        // Log the status update
        const action = status === 'approved' ? 'APPROVE_PAYMENT_UPLOAD' : 'REJECT_PAYMENT_UPLOAD';
        await logActivity(action, 'payment_upload', uploadId, { new_status: status, notes });

        await fetchUploads();
    }, [fetchUploads, logActivity]);

    // Archive payment upload (soft delete)
    const archiveUpload = useCallback(async (uploadId: string, reason?: string) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('payment_uploads')
            .update({
                archived_at: new Date().toISOString(),
                archived_by: user.id,
                archive_reason: reason || 'Archived by admin',
            })
            .eq('id', uploadId);

        if (error) throw error;

        await logActivity('ARCHIVE_PAYMENT_UPLOAD', 'payment_upload', uploadId, { reason: reason || 'Archived by admin' });

        await fetchUploads();
    }, [fetchUploads, logActivity]);

    // Restore archived upload
    const restoreUpload = useCallback(async (uploadId: string) => {
        const supabase = createClient();

        const { error } = await supabase
            .from('payment_uploads')
            .update({
                archived_at: null,
                archived_by: null,
                archive_reason: null,
            })
            .eq('id', uploadId);

        if (error) throw error;

        await logActivity('RESTORE_PAYMENT_UPLOAD', 'payment_upload', uploadId, {});

        await fetchUploads();
        await fetchArchivedUploads();
    }, [fetchUploads, fetchArchivedUploads, logActivity]);

    // Permanent delete (for super_admin only)
    const permanentlyDeleteUpload = useCallback(async (uploadId: string) => {
        const supabase = createClient();

        // Log before deleting
        await logActivity('DELETE_PAYMENT_UPLOAD', 'payment_upload', uploadId, { permanent: true });

        const { error } = await supabase
            .from('payment_uploads')
            .delete()
            .eq('id', uploadId);

        if (error) throw error;
        await fetchArchivedUploads();
    }, [fetchArchivedUploads, logActivity]);

    return {
        uploads,
        archivedUploads,
        loading,
        error,
        updateStatus,
        archiveUpload,
        restoreUpload,
        permanentlyDeleteUpload,
        fetchArchivedUploads,
        refetch: fetchUploads,
    };
}
