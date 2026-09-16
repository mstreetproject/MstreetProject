'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';

interface Payout {
    id: string;
    credit_id: string;
    creditor_id: string;
    principal_amount: number;
    interest_amount: number;
    total_amount: number;
    payout_type: 'interest_only' | 'partial_principal' | 'full_maturity' | 'early_withdrawal';
    notes: string | null;
    processed_by: string | null;
    created_at: string;
    // Joined data
    creditor?: {
        full_name: string;
        email: string;
    };
    processor?: {
        full_name: string;
    };
}

interface CreditWithAccrual {
    id: string;
    creditor_id: string;
    principal: number;
    interest_rate: number;
    tenure_months: number;
    start_date: string;
    end_date: string;
    status: string;
    interest_type: string;
    remaining_principal: number;
    total_paid_out: number;
    creditor_name: string;
    creditor_email: string;
    days_elapsed: number;
    interest_accrued: number;
    current_value: number;
    maturity_value: number;
    is_matured: boolean;
}

export function useCreditorPayouts() {
    const { logActivity } = useActivityLog();
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Fetch payouts for a specific credit
    const fetchPayoutsForCredit = useCallback(async (creditId: string) => {
        try {
            setLoading(true);
            const supabase = createClient();

            const { data, error: fetchError } = await supabase
                .from('creditor_payouts')
                .select(`
                    *,
                    creditor:users!creditor_payouts_creditor_id_fkey(full_name, email),
                    processor:users!creditor_payouts_processed_by_fkey(full_name)
                `)
                .eq('credit_id', creditId)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setPayouts(data || []);
            return data || [];
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch payouts'));
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Get credit with calculated accrual from the view
    const getCreditWithAccrual = useCallback(async (creditId: string): Promise<CreditWithAccrual | null> => {
        try {
            const supabase = createClient();

            const { data, error } = await supabase
                .from('credits_with_accrual')
                .select('*')
                .eq('id', creditId)
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error fetching credit with accrual:', err);
            return null;
        }
    }, []);

    // Calculate interest for a credit (client-side fallback)
    const calculateInterest = useCallback((
        principal: number,
        rate: number,
        startDate: string,
        interestType: 'simple' | 'compound' = 'simple'
    ) => {
        const start = new Date(startDate);
        const now = new Date();
        const daysElapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

        if (interestType === 'simple') {
            return principal * (rate / 100) * (daysElapsed / 365);
        } else {
            // Compound interest (monthly)
            const monthsElapsed = Math.floor(daysElapsed / 30);
            return principal * (Math.pow(1 + (rate / 100 / 12), monthsElapsed) - 1);
        }
    }, []);

    // Record a payout
    const recordPayout = useCallback(async (
        creditId: string,
        principalAmount: number,
        interestAmount: number,
        payoutType: 'interest_only' | 'partial_principal' | 'full_maturity' | 'early_withdrawal',
        notes?: string
    ) => {
        try {
            setLoading(true);
            const supabase = createClient();

            const { data: payoutId, error } = await supabase
                .rpc('record_creditor_payout', {
                    p_credit_id: creditId,
                    p_principal_amount: principalAmount,
                    p_interest_amount: interestAmount,
                    p_payout_type: payoutType,
                    p_notes: notes || null
                });

            if (error) throw error;

            await logActivity('RECORD_PAYOUT', 'payout', payoutId, {
                creditId: creditId,
                amount: principalAmount + interestAmount,
                type: payoutType,
                notes: notes
            });

            return { success: true, payoutId };
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to record payout'));
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Get all payouts (for admin view)
    const fetchAllPayouts = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            const { data, error: fetchError } = await supabase
                .from('creditor_payouts')
                .select(`
                    *,
                    creditor:users!creditor_payouts_creditor_id_fkey(full_name, email),
                    processor:users!creditor_payouts_processed_by_fkey(full_name)
                `)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setPayouts(data || []);
            return data || [];
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch payouts'));
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        payouts,
        loading,
        error,
        fetchPayoutsForCredit,
        fetchAllPayouts,
        getCreditWithAccrual,
        calculateInterest,
        recordPayout,
    };
}
