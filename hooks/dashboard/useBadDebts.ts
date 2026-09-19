'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface BadDebt {
    id: string;
    loan_id: string;
    declared_date: string;
    amount: number;
    reason: string | null;
    recovered_amount: number;
    recovery_date: string | null;
    is_fully_recovered: boolean;
    created_at: string;
    // Joined data
    loan?: {
        principal: number;
        interest_rate: number;
        debtor_id: string;
        status: string;
        debtor?: {
            full_name: string;
            email: string;
        };
    };
}

export interface BadDebtStats {
    totalCount: number;
    totalAmount: number;
    recoveredCount: number;
    recoveredAmount: number;
    outstandingCount: number;
    outstandingAmount: number;
}

interface UseBadDebtsResult {
    badDebts: BadDebt[];
    stats: BadDebtStats;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}

export function useBadDebts(): UseBadDebtsResult {
    const [badDebts, setBadDebts] = useState<BadDebt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchBadDebts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const supabase = createClient();

            // 1. Fetch bad_debts table entries
            const { data, error: fetchError } = await supabase
                .from('bad_debts')
                .select('*')
                .order('declared_date', { ascending: false });

            if (fetchError) {
                console.error('Bad debts fetch error:', fetchError);
                throw fetchError;
            }

            // 2. Fetch all full_provision loans (exclude archived)
            const { data: fullProvisionLoans, error: fpError } = await supabase
                .from('loans')
                .select('id, principal, interest_rate, debtor_id, status, start_date, debtor:users!loans_debtor_id_fkey(full_name, email)')
                .eq('status', 'full_provision')
                .is('archived_at', null)
                .neq('status', 'archived');

            if (fpError) {
                console.error('Full provision loans fetch error:', fpError);
            }

            // 3. Get loan IDs already in bad_debts
            const badDebtLoanIds = new Set((data || []).map(bd => bd.loan_id).filter(Boolean));

            // 4. Fetch loan info for existing bad_debts records
            let merged: BadDebt[] = [];

            if (data && data.length > 0) {
                const loanIds = data.map(bd => bd.loan_id).filter(Boolean);

                const { data: loansData } = await supabase
                    .from('loans')
                    .select('id, principal, interest_rate, debtor_id, status, debtor:users!loans_debtor_id_fkey(full_name, email)')
                    .in('id', loanIds);

                merged = data.map(bd => ({
                    ...bd,
                    loan: loansData?.find(l => l.id === bd.loan_id) || null
                })) as BadDebt[];
            }

            // 5. Create virtual bad debt entries for full_provision loans NOT already in bad_debts
            if (fullProvisionLoans && fullProvisionLoans.length > 0) {
                const virtualEntries: BadDebt[] = fullProvisionLoans
                    .filter(loan => !badDebtLoanIds.has(loan.id))
                    .map(loan => ({
                        id: `virtual_${loan.id}`, // Virtual ID — not in DB yet
                        loan_id: loan.id,
                        declared_date: loan.start_date || new Date().toISOString().split('T')[0],
                        amount: Number(loan.principal || 0),
                        reason: 'Full provision — auto-detected from loan status',
                        recovered_amount: 0,
                        recovery_date: null,
                        is_fully_recovered: false,
                        created_at: new Date().toISOString(),
                        loan: {
                            principal: Number(loan.principal || 0),
                            interest_rate: Number(loan.interest_rate || 0),
                            debtor_id: loan.debtor_id,
                            status: loan.status,
                            debtor: loan.debtor as any,
                        }
                    }));

                merged = [...merged, ...virtualEntries];
            }

            setBadDebts(merged);
        } catch (err) {
            console.error('Failed to fetch bad debts:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch bad debts'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBadDebts();
    }, [fetchBadDebts]);

    // Calculate stats
    const stats: BadDebtStats = {
        totalCount: badDebts.length,
        totalAmount: badDebts.reduce((sum, bd) => sum + Number(bd.amount || 0), 0),
        recoveredCount: badDebts.filter(bd => bd.is_fully_recovered).length,
        recoveredAmount: badDebts.reduce((sum, bd) => sum + Number(bd.recovered_amount || 0), 0),
        outstandingCount: badDebts.filter(bd => !bd.is_fully_recovered).length,
        outstandingAmount: badDebts.reduce((sum, bd) => {
            const outstanding = Number(bd.amount || 0) - Number(bd.recovered_amount || 0);
            return sum + Math.max(0, outstanding);
        }, 0),
    };

    return {
        badDebts,
        stats,
        loading,
        error,
        refetch: fetchBadDebts,
    };
}
