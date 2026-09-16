'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Investment {
    id: string;
    investee_id: string;
    investee_name: string;
    principal: number;
    roi_rate: number;
    tenure_months: number;
    start_date: string;
    end_date: string;
    status: string;
    liquidated_at: string | null;
    liquidation_amount: number | null;
    liquidation_notes: string | null;
    created_at: string;
    documents: { id: string; file_url: string; file_name: string }[];
}

export function useAllInvestments() {
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalInvested: 0,
        activeCount: 0,
        totalROIExpected: 0
    });

    const fetchInvestments = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            const { data, error } = await supabase
                .from('investments')
                .select(`
                    *,
                    investee:investee_companies(name),
                    documents:investment_documents(id, file_url, file_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedData: Investment[] = data.map((inv: any) => ({
                ...inv,
                investee_name: inv.investee?.name || inv.company_name || 'Unknown'
            }));

            setInvestments(mappedData);

            // Calculate stats
            const active = mappedData.filter(i => i.status === 'active');
            const totalInvested = active.reduce((sum, i) => sum + Number(i.principal), 0);
            const totalROI = active.reduce((sum, i) => {
                const roi = (Number(i.principal) * Number(i.roi_rate) / 100) * (i.tenure_months / 12);
                return sum + roi;
            }, 0);

            setStats({
                totalInvested,
                activeCount: active.length,
                totalROIExpected: totalROI
            });

        } catch (err) {
            console.error('Error fetching investments:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInvestments();
    }, [fetchInvestments]);

    return { investments, loading, stats, refresh: fetchInvestments };
}
