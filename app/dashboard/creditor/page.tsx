'use client';

import React, { useState } from 'react';
import { TrendingUp, DollarSign, FileText, PieChart, Wallet } from 'lucide-react';
import { useUser } from '@/hooks/dashboard/useUser';
import { useCurrency } from '@/hooks/useCurrency';
import { useMyInvestments, MyInvestment } from '@/hooks/dashboard/useMyInvestments';
import { useNotifications } from '@/hooks/dashboard/useNotifications';
import InvestmentFilter from '@/components/dashboard/InvestmentFilter';
import TimePeriodFilter from '@/components/dashboard/TimePeriodFilter';
import DateRangeFilter from '@/components/dashboard/DateRangeFilter';
import { TimePeriod, DateRange, TIME_PERIODS } from '@/hooks/dashboard/useCreditorStats';
import MStreetLoader from '@/components/ui/MStreetLoader';

import StatsCard from '@/components/dashboard/StatsCard';

export default function CreditorDashboard() {
    const { user } = useUser();
    const { formatCurrency } = useCurrency();
    const { investments, loading } = useMyInvestments();
    const { notifications } = useNotifications();

    // Filters State
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
    const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
    const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null);

    // Handle Time Period Change
    const handleSetTimePeriod = (period: TimePeriod) => {
        setTimePeriod(period);
        setDateRange({ startDate: null, endDate: null });
        setSelectedInvestmentId(null); // Reset specific investment when changing global period
    };

    // Handle Date Range Change
    const handleSetDateRange = (range: DateRange) => {
        setDateRange(range);
        if (range.startDate || range.endDate) {
            setTimePeriod('all');
        }
        setSelectedInvestmentId(null); // Reset specific investment when changing date range
    };

    // Handle Investment Selection
    const handleSetInvestment = (id: string | null) => {
        setSelectedInvestmentId(id);
        // We generally keep the date filters as is, but this focus overrides the stats view.
    };

    // Filter Investments & Calculate Stats
    const stats = React.useMemo(() => {
        console.log('CreditorDashboard: calculating stats with investments:', investments);

        // 1. Filter Logic
        let filteredInvestments = investments;

        if (selectedInvestmentId) {
            // If specific investment selected, IGNORE date filters and show only that one
            filteredInvestments = investments.filter(inv => inv.id === selectedInvestmentId);
        } else {
            // Otherwise apply Date/Time filters
            filteredInvestments = investments.filter(inv => {
                const date = new Date(inv.start_date); // Use start_date for filtering

                // Custom Range
                if (dateRange.startDate && date < dateRange.startDate) return false;
                if (dateRange.endDate && date > dateRange.endDate) return false;

                // Time Period
                if (timePeriod !== 'all' && !dateRange.startDate && !dateRange.endDate) {
                    const days = TIME_PERIODS[timePeriod]?.days || 0;
                    if (days > 0) {
                        const cutoff = new Date();
                        cutoff.setDate(cutoff.getDate() - days);
                        if (date < cutoff) return false;
                    }
                }
                return true;
            });
        }

        // 2. Calculate Stats based on FILTERED data (Historical Performance)

        // A. Total Invested (Principal Amount)
        // Sum of original principal for all loans in the selected period (Active + Matured + Archived).
        const totalInvested = filteredInvestments.reduce((sum, inv) => sum + inv.principal, 0);

        // B. Total Returns (Total Amount Paid to Creditor)
        // User definition: "total amounts withdrawn and paid to the creditor"
        // This comes from the 'total_paid_out' column which allows partial withdrawals.
        const totalReturns = filteredInvestments.reduce((sum, inv) => sum + (inv.total_paid_out || 0), 0);

        // C. Net Profit (Realized Earnings)
        // User Request: "Net Profit should be Total Returns - Total Invested"
        // This effectively represents Net Cash Flow (Cash In - Cash Out).
        // If negative, it means more money is currently invested than has been withdrawn.
        const netProfit = totalReturns - totalInvested;

        // D. Active Portfolio Value (Current Snapshot - NOT Filtered by Date)
        // User definition: "funds yet to be paid out plus expected earning from the matured payout"
        // This includes Active and Matured loans.
        const activePortfolioInvestments = investments.filter(inv =>
            inv.status === 'active' || inv.status === 'matured'
        );
        const activePortfolioValue = activePortfolioInvestments.reduce((sum, inv) => sum + inv.current_value, 0);

        // E. Loans Funded (In the period)
        const loansFunded = filteredInvestments.length;

        return {
            totalInvested,
            totalReturns,
            netProfit,
            activePortfolioValue,
            loansFunded,
            filteredCount: filteredInvestments.length
        };
    }, [investments, timePeriod, dateRange, selectedInvestmentId]);

    if (loading) {
        return (
            <div style={{
                height: 'calc(100vh - 82px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)'
            }}>
                <MStreetLoader size={120} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Loading dashboard...
                </p>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            {/* Header & Filters */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
                        Welcome back, {user?.full_name?.split(' ')[0]}
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>Overview of your investment portfolio.</p>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <InvestmentFilter
                        investments={investments} // Pass all investments to allow searching/selecting any
                        selectedId={selectedInvestmentId}
                        onChange={handleSetInvestment}
                    />
                    <div style={{ width: '1px', height: '24px', background: 'var(--border-primary)', margin: '0 4px' }} />
                    <TimePeriodFilter
                        value={timePeriod}
                        onChange={handleSetTimePeriod}
                    />
                    <DateRangeFilter
                        value={dateRange}
                        onChange={handleSetDateRange}
                    />
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '32px'
            }}>
                <StatsCard
                    title="Total Invested"
                    value={formatCurrency(stats.totalInvested)}
                    change="Principal Amount"
                    changeType="neutral"
                    icon={Wallet}
                    loading={loading}
                />
                <StatsCard
                    title="Total Returns"
                    value={formatCurrency(stats.totalReturns)}
                    change="Total Withdrawn"
                    changeType="positive"
                    icon={TrendingUp}
                    loading={loading}
                />
                <StatsCard
                    title="Net Profit"
                    value={formatCurrency(stats.netProfit)}
                    change={`${stats.totalInvested > 0 ? `+${((stats.netProfit / stats.totalInvested) * 100).toFixed(1)}%` : '0%'} Realized Profit`}
                    changeType="positive"
                    icon={DollarSign}
                    loading={loading}
                />
                <StatsCard
                    title="Active Portfolio"
                    value={formatCurrency(stats.activePortfolioValue)}
                    change="Current Value (Active & Matured)"
                    changeType="neutral"
                    icon={PieChart}
                    loading={loading}
                />
                <StatsCard
                    title="Loans Funded"
                    value={stats.loansFunded}
                    change="In selected period"
                    changeType="neutral"
                    icon={FileText}
                    loading={loading}
                />
            </div>

            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-primary)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>Recent Activity</h2>

                {notifications.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No recent activity to display.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {notifications.slice(0, 5).map((n) => (
                            <div key={n.id} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '1px solid var(--border-primary)' }}>
                                <div style={{
                                    minWidth: '36px', height: '36px', borderRadius: '50%',
                                    background: 'var(--bg-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--accent-primary)'
                                }}>
                                    {n.type === 'credit' ? <Wallet size={18} /> :
                                        n.type === 'loan' ? <FileText size={18} /> :
                                            n.type === 'expense' ? <DollarSign size={18} /> :
                                                <TrendingUp size={18} />}
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                        {n.title}
                                    </h4>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', lineHeight: '1.4' }}>
                                        {n.message}
                                    </p>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {new Date(n.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    card: {
        background: 'var(--bg-card)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid var(--border-primary)',
        minWidth: '0', // Prevent overflow
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px',
    },
    cardTitle: {
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        fontWeight: '500',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    iconWrapper: {
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardValue: {
        color: 'var(--text-primary)',
        fontSize: '1.4rem',
        fontWeight: '700',
        marginBottom: '4px',
    },
    cardChange: {
        color: 'var(--text-muted)',
        fontSize: '0.75rem',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
};
