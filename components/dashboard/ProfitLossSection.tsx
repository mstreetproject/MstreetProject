'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import StatsCard from './StatsCard';
import DateRangeFilter from './DateRangeFilter';
import { useCurrency } from '@/hooks/useCurrency';
import { TrendingUp, TrendingDown, DollarSign, Wallet, AlertOctagon } from 'lucide-react';
import styles from './ProfitLossSection.module.css';

interface PnLSummary {
    total_revenue: number;
    finance_costs: number;
    operating_expenses: number;
    bad_debt: number;
    net_profit: number;
}

export default function ProfitLossSection() {
    const { formatCurrency } = useCurrency();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<PnLSummary>({
        total_revenue: 0,
        finance_costs: 0,
        operating_expenses: 0,
        bad_debt: 0,
        net_profit: 0
    });

    const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Start of current month
        endDate: new Date() // Today
    });

    const fetchData = useCallback(async () => {
        if (!dateRange.startDate || !dateRange.endDate) return;

        setLoading(true);
        const supabase = createClient();

        try {
            const { data: pnlData, error } = await supabase
                .rpc('get_profit_loss_summary', {
                    start_date: dateRange.startDate.toISOString(),
                    end_date: dateRange.endDate.toISOString()
                });

            if (error) throw error;

            if (pnlData) {
                // Parse JSON if needed, though supabase client usually handles it
                // RPC returns JSON type, so it might come as object
                setData(pnlData as PnLSummary);
            }
        } catch (error) {
            console.error('Error fetching P&L data:', error);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const isProfitPositive = data.net_profit >= 0;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <h2 className={styles.title}>Profit & Loss Statement</h2>
                    <p className={styles.subtitle}>
                        Overview of revenue, expenses, and net profit
                    </p>
                </div>
                <div className={styles.filters}>
                    <DateRangeFilter
                        value={dateRange}
                        onChange={setDateRange}
                    />
                </div>
            </div>

            <div className={styles.grid}>
                {/* Revenue */}
                <StatsCard
                    title="Revenue"
                    value={formatCurrency(data.total_revenue)}
                    icon={TrendingUp}
                    loading={loading}
                    changeType="positive"
                    change="Interest Earned"
                />

                {/* Finance Costs */}
                <StatsCard
                    title="Finance Costs"
                    value={formatCurrency(data.finance_costs)}
                    icon={Wallet}
                    loading={loading}
                    changeType="negative"
                    change="Interest Paid"
                />

                {/* Operating Expenses */}
                <StatsCard
                    title="Operating Expenses"
                    value={formatCurrency(data.operating_expenses)}
                    icon={DollarSign}
                    loading={loading}
                    changeType="negative"
                    change="Ops & Overhead"
                />

                {/* Bad Debt */}
                <StatsCard
                    title="Bad Debt"
                    value={formatCurrency(data.bad_debt)}
                    icon={AlertOctagon}
                    loading={loading}
                    changeType="negative"
                    change="Defaulted Principal"
                />

                {/* Net Profit */}
                <div className={`${styles.netProfitWrapper} ${isProfitPositive ? '' : styles.negativeProfit}`}>
                    <StatsCard
                        title="Net Profit"
                        value={formatCurrency(data.net_profit)}
                        icon={isProfitPositive ? TrendingUp : TrendingDown}
                        loading={loading}
                        changeType={isProfitPositive ? 'positive' : 'negative'}
                        change={isProfitPositive ? 'Net Gain' : 'Net Loss'}
                    />
                </div>
            </div>
        </div>
    );
}
