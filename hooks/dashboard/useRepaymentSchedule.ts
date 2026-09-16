'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface RepaymentScheduleItem {
    id: string;
    loan_id: string;
    installment_no: number;
    due_date: string;
    principal_amount: number;
    interest_amount: number;
    total_amount: number;
    status: 'pending' | 'paid' | 'partial' | 'overdue';
    paid_at: string | null;
}

export function useRepaymentSchedule(loanId: string | null) {
    const [schedule, setSchedule] = useState<RepaymentScheduleItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchSchedule = useCallback(async () => {
        if (!loanId) {
            setSchedule([]);
            return;
        }

        try {
            setLoading(true);
            const supabase = createClient();
            const { data, error: fetchError } = await supabase
                .from('repayment_schedules')
                .select('*')
                .eq('loan_id', loanId)
                .order('installment_no', { ascending: true });

            if (fetchError) throw fetchError;
            setSchedule(data || []);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch schedule'));
        } finally {
            setLoading(false);
        }
    }, [loanId]);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    const updateInstallmentStatus = async (id: string, status: string, paidAt?: string) => {
        try {
            const supabase = createClient();
            const { error: updateError } = await supabase
                .from('repayment_schedules')
                .update({ status, paid_at: paidAt || new Date().toISOString() })
                .eq('id', id);

            if (updateError) throw updateError;
            await fetchSchedule();
        } catch (err) {
            console.error('Error updating installment status:', err);
            throw err;
        }
    };

    return {
        schedule,
        loading,
        error,
        refetch: fetchSchedule,
        updateInstallmentStatus
    };
}
