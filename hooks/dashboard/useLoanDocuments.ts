'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface LoanDocument {
    id: string;
    loan_id: string;
    debtor_id: string;
    file_url: string;
    file_name: string;
    is_signed: boolean;
    signed_at: string | null;
    signature_data: string | null;
    signed_file_url: string | null;
    created_at: string;
}

export function useLoanDocuments(loanId: string | null) {
    const [documents, setDocuments] = useState<LoanDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchDocuments = useCallback(async () => {
        if (!loanId) {
            setDocuments([]);
            return;
        }

        try {
            setLoading(true);
            const supabase = createClient();
            const { data, error: fetchError } = await supabase
                .from('loan_documents')
                .select('*')
                .eq('loan_id', loanId)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setDocuments(data || []);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch documents'));
        } finally {
            setLoading(false);
        }
    }, [loanId]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    return {
        documents,
        loading,
        error,
        refetch: fetchDocuments
    };
}
