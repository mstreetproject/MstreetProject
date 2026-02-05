import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface FundItem {
    id: string;
    source: string; // Name of Creditor/Debtor/Investee
    reference?: string;
    amount: number;
    rate: number; // Cost of Funds % or Yield %
    type: 'ngn' | 'usd'; // In future, if we distinguish. For now, defaulting or inferring.
    cumulativeReturn: number; // amount * (rate / 100)
}

export interface FundPoolSummary {
    totalLiabilities: number;
    totalAssets: number;
    weightedAvgCostOfFunds: number;
    weightedAvgYield: number;
    netSpread: number;
}

export function useFundPoolData(dateRange?: { startDate: Date | null; endDate: Date | null }) {
    const [loading, setLoading] = useState(true);
    const [liabilities, setLiabilities] = useState<FundItem[]>([]);
    const [assets, setAssets] = useState<FundItem[]>([]);
    const [summary, setSummary] = useState<FundPoolSummary>({
        totalLiabilities: 0,
        totalAssets: 0,
        weightedAvgCostOfFunds: 0,
        weightedAvgYield: 0,
        netSpread: 0
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            // 1. Fetch Liabilities (Credits)
            let creditsQuery = supabase
                .from('credits')
                .select(`
                    id,
                    principal,
                    interest_rate,
                    start_date,
                    creditor:users!creditor_id(full_name)
                `)
                .eq('status', 'active');

            if (dateRange?.startDate) {
                creditsQuery = creditsQuery.gte('start_date', dateRange.startDate.toISOString());
            }
            if (dateRange?.endDate) {
                creditsQuery = creditsQuery.lte('start_date', dateRange.endDate.toISOString());
            }

            const { data: creditsData, error: creditsError } = await creditsQuery;

            if (creditsError) throw creditsError;

            // 2. Fetch Assets (Loans)
            let loansQuery = supabase
                .from('loans')
                .select(`
                    id,
                    principal,
                    interest_rate,
                    reference_no,
                    start_date,
                    debtor:users!debtor_id(full_name)
                `)
                .in('status', ['performing', 'non_performing']);

            if (dateRange?.startDate) {
                loansQuery = loansQuery.gte('start_date', dateRange.startDate.toISOString());
            }
            if (dateRange?.endDate) {
                loansQuery = loansQuery.lte('start_date', dateRange.endDate.toISOString());
            }

            const { data: loansData, error: loansError } = await loansQuery;

            if (loansError) throw loansError;

            // 3. Fetch Assets (Investments)
            let investmentsQuery = supabase
                .from('investments')
                .select(`
                    id,
                    principal,
                    roi_rate,
                    start_date,
                    investee:investee_companies!investee_id(name),
                    company_name
                `)
                .eq('status', 'active');

            if (dateRange?.startDate) {
                investmentsQuery = investmentsQuery.gte('start_date', dateRange.startDate.toISOString());
            }
            if (dateRange?.endDate) {
                investmentsQuery = investmentsQuery.lte('start_date', dateRange.endDate.toISOString());
            }

            const { data: investmentsData, error: investmentsError } = await investmentsQuery;

            if (investmentsError) throw investmentsError;

            // --- Process Liabilities ---
            const liabilitiesFormatted: FundItem[] = (creditsData || []).map((item: any) => ({
                id: item.id,
                source: item.creditor?.full_name || 'Unknown Creditor',
                reference: 'Credit',
                amount: Number(item.principal),
                rate: Number(item.interest_rate),
                type: 'ngn', // Defaulting for now as schema is generic
                cumulativeReturn: Number(item.principal) * (Number(item.interest_rate) / 100)
            }));

            // --- Process Assets ---
            const loansFormatted: FundItem[] = (loansData || []).map((item: any) => ({
                id: item.id,
                source: item.debtor?.full_name || 'Unknown Debtor',
                reference: item.reference_no || 'Loan',
                amount: Number(item.principal),
                rate: Number(item.interest_rate),
                type: 'ngn',
                cumulativeReturn: Number(item.principal) * (Number(item.interest_rate) / 100)
            }));

            const investmentsFormatted: FundItem[] = (investmentsData || []).map((item: any) => ({
                id: item.id,
                source: item.investee?.name || item.company_name || 'Unknown Investee',
                reference: 'Investment',
                amount: Number(item.principal),
                rate: Number(item.roi_rate),
                type: 'ngn',
                cumulativeReturn: Number(item.principal) * (Number(item.roi_rate) / 100)
            }));

            const assetsFormatted = [...loansFormatted, ...investmentsFormatted];

            setLiabilities(liabilitiesFormatted);
            setAssets(assetsFormatted);

            // --- Calculate Summary ---
            const totalLiabilities = liabilitiesFormatted.reduce((sum, item) => sum + item.amount, 0);
            const totalAssets = assetsFormatted.reduce((sum, item) => sum + item.amount, 0);

            const totalLiabilityCost = liabilitiesFormatted.reduce((sum, item) => sum + item.cumulativeReturn, 0);
            const totalAssetYield = assetsFormatted.reduce((sum, item) => sum + item.cumulativeReturn, 0);

            // Weighted Averages
            const wAvgCost = totalLiabilities > 0 ? (totalLiabilityCost / totalLiabilities) * 100 : 0;
            const wAvgYield = totalAssets > 0 ? (totalAssetYield / totalAssets) * 100 : 0;

            setSummary({
                totalLiabilities,
                totalAssets,
                weightedAvgCostOfFunds: wAvgCost,
                weightedAvgYield: wAvgYield,
                netSpread: wAvgYield - wAvgCost
            });

        } catch (error) {
            console.error('Error fetching fund pool data:', error);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { liabilities, assets, summary, loading, refresh: fetchData };
}
