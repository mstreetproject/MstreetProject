'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/dashboard/useUser';
import { calculateSimpleInterest } from '@/lib/interest';

export interface MyInvestment {
    id: string;
    borrower: string;
    principal: number;
    interest_rate: number;
    tenure_months: number;
    start_date: string;
    end_date: string | null;
    status: string;
    current_value: number;
    maturity_value: number;
    matures_at: string;
    remaining_principal?: number;
    total_paid_out?: number;
}

export function useMyInvestments() {
    const { user } = useUser();
    const [investments, setInvestments] = useState<MyInvestment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchInvestments = useCallback(async () => {
        if (!user?.id) {
            console.log('useMyInvestments: No user ID available');
            setLoading(false); // Ensure loading is turned off if no user
            return;
        }

        console.log('useMyInvestments: Fetching for user ID:', user.id);

        try {
            setLoading(true);
            const supabase = createClient();

            // Log the query we are about to make
            console.log('useMyInvestments: Querying credits table...');

            // Minimum loading time for smooth UI
            const minLoadTime = new Promise(resolve => setTimeout(resolve, 500));

            const dbRequest = supabase
                .from('credits')
                .select('*')
                .eq('creditor_id', user.id)
                .order('start_date', { ascending: false });

            const [_, { data, error: fetchError }] = await Promise.all([minLoadTime, dbRequest]);

            console.log('useMyInvestments: Raw Data:', data);
            console.log('useMyInvestments: Error:', fetchError);

            if (fetchError) throw fetchError;

            if (data) {
                const mappedData: MyInvestment[] = data.map((credit: any) => {
                    const principal = Number(credit.remaining_principal ?? credit.principal);
                    const originalPrincipal = Number(credit.principal);
                    const rate = Number(credit.interest_rate);
                    const tenure = Number(credit.tenure_months || 0);

                    // 1. Current Value: Remaining Principal + Accrued Interest
                    // Pass end_date if it exists (for matured/closed loans)
                    const accruedInterest = calculateSimpleInterest(
                        principal,
                        rate,
                        credit.start_date,
                        credit.end_date
                    );
                    const currentValue = principal + accruedInterest;

                    // 2. Maturity Value: Original Principal + Total Expected Interest
                    // Formula: P + (P * Rate * Tenure/12)
                    const totalExpectedInterest = originalPrincipal * (rate / 100) * (tenure / 12);
                    const maturityValue = originalPrincipal + totalExpectedInterest;

                    // 3. Maturity Date
                    let maturesAt = credit.end_date;
                    if (!maturesAt && credit.start_date) {
                        const startDate = new Date(credit.start_date);
                        startDate.setMonth(startDate.getMonth() + tenure);
                        maturesAt = startDate.toISOString();
                    }

                    return {
                        id: credit.id,
                        borrower: 'MStreet Financial',
                        principal: originalPrincipal,
                        remaining_principal: principal,
                        interest_rate: rate,
                        tenure_months: tenure,
                        start_date: credit.start_date,
                        end_date: credit.end_date,
                        status: credit.status,
                        current_value: currentValue,
                        maturity_value: maturityValue,
                        matures_at: maturesAt,
                        total_paid_out: Number(credit.total_paid_out || 0),
                    };
                });

                setInvestments(mappedData);
            }
        } catch (err) {
            console.error('Error fetching investments:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch investments'));
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchInvestments();
    }, [fetchInvestments]);

    return {
        investments,
        loading,
        error,
        refetch: fetchInvestments
    };
}
