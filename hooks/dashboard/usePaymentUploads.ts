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
    created_at: string;
}

interface UploadPaymentData {
    loan_id: string;
    file_url: string;
    file_name: string;
    amount_paid?: number;
    payment_date?: string;
}

export function usePaymentUploads() {
    const [uploads, setUploads] = useState<PaymentUpload[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const { logActivity } = useActivityLog();

    const fetchUploads = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error: fetchError } = await supabase
                .from('payment_uploads')
                .select('*')
                .eq('debtor_id', user.id)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setUploads(data || []);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch uploads'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUploads();
    }, [fetchUploads]);

    const uploadPayment = useCallback(async (data: UploadPaymentData) => {
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: insertedData, error: insertError } = await supabase
            .from('payment_uploads')
            .insert({
                ...data,
                debtor_id: user.id,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // Log the payment upload creation
        await logActivity('CREATE_PAYMENT_UPLOAD', 'payment_upload', insertedData?.id || '', {
            loan_id: data.loan_id,
            amount_paid: data.amount_paid,
            payment_date: data.payment_date,
        });

        await fetchUploads(); // Refresh the list
    }, [fetchUploads, logActivity]);

    return {
        uploads,
        loading,
        error,
        uploadPayment,
        refetch: fetchUploads,
    };
}
