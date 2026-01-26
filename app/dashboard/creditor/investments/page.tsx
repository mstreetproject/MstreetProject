'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Plus, DollarSign, PieChart } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { useMyInvestments } from '@/hooks/dashboard/useMyInvestments';
import { useMyPayoutRequests } from '@/hooks/dashboard/useMyPayoutRequests';
import { TIME_PERIODS, TimePeriod } from '@/hooks/dashboard/useCreditorStats';
import styles from './page.module.css';
import RequestPayoutModal from '@/components/dashboard/RequestPayoutModal';
import InvestmentsTable from '@/components/dashboard/InvestmentsTable';
import PayoutHistoryTable from '@/components/dashboard/PayoutHistoryTable';
import InvestmentFilter from '@/components/dashboard/InvestmentFilter';
import TimePeriodFilter from '@/components/dashboard/TimePeriodFilter';
import DateRangeFilter from '@/components/dashboard/DateRangeFilter';
import MStreetLoader from '@/components/ui/MStreetLoader';

export default function CreditorInvestmentsPage() {
    const { formatCurrency } = useCurrency();
    const { investments, loading: investmentsLoading } = useMyInvestments();
    const { requests: payoutRequests, loading: payoutsLoading } = useMyPayoutRequests();

    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'investments' | 'payouts'>('investments');

    // Filter states
    const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null);
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
    const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({ startDate: null, endDate: null });

    // Filter handlers
    const handleSetInvestment = useCallback((id: string | null) => {
        setSelectedInvestmentId(id);
    }, []);

    const handleSetTimePeriod = useCallback((period: TimePeriod) => {
        setTimePeriod(period);
        setDateRange({ startDate: null, endDate: null }); // Reset custom date range
    }, []);

    const handleSetDateRange = useCallback((range: { startDate: Date | null; endDate: Date | null }) => {
        setDateRange(range);
        setTimePeriod('all'); // Reset time period
    }, []);

    // Filter Logic for Investments
    const filteredInvestments = useMemo(() => {
        let filtered = investments;

        if (selectedInvestmentId) {
            filtered = filtered.filter(inv => inv.id === selectedInvestmentId);
        }

        return filtered;
    }, [investments, selectedInvestmentId]);

    // Filter Logic for Payout Requests
    const filteredPayouts = useMemo(() => {
        let filtered = payoutRequests;

        if (selectedInvestmentId) {
            // Safely access credit.id
            filtered = filtered.filter(req => req.credit?.id === selectedInvestmentId);
        }

        filtered = filtered.filter(req => {
            const date = new Date(req.created_at);
            if (dateRange.startDate && date < dateRange.startDate) return false;
            if (dateRange.endDate && date > dateRange.endDate) return false;

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

        return filtered;
    }, [payoutRequests, timePeriod, dateRange, selectedInvestmentId]);


    if (investmentsLoading || payoutsLoading) {
        return (
            <div className={styles.loading}>
                <MStreetLoader size={120} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Loading your investments...
                </p>
            </div>
        );
    }

    // Modal data preparation
    const modalInvestments = investments.map(inv => ({
        ...inv,
        amount: inv.remaining_principal ?? inv.principal
    }));

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>My Investments</h1>
                    <p className={styles.pageSubtitle}>Track your active and past investments.</p>
                </div>
                <button
                    onClick={() => setIsRequestModalOpen(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        color: 'white', border: 'none', borderRadius: '10px', fontWeight: 600,
                        cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(2, 179, 255, 0.2)'
                    }}
                >
                    <Plus size={18} />
                    Request Payment
                </button>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <InvestmentFilter
                    investments={investments}
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

            {/* Tabs (Money Requests Style) */}
            <div className={styles.tabsContainer}>
                <div className={styles.tabs}>
                    <button
                        onClick={() => setActiveTab('investments')}
                        className={`${styles.tab} ${activeTab === 'investments' ? styles.tabActive : ''}`}
                    >
                        <PieChart size={18} />
                        Investments
                    </button>
                    <button
                        onClick={() => setActiveTab('payouts')}
                        className={`${styles.tab} ${activeTab === 'payouts' ? styles.tabActive : ''}`}
                    >
                        <DollarSign size={18} />
                        Payout Request History
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className={styles.section}>
                {activeTab === 'investments' ? (
                    <InvestmentsTable investments={filteredInvestments} />
                ) : (
                    <PayoutHistoryTable requests={filteredPayouts} />
                )}
            </div>

            <RequestPayoutModal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                onSuccess={() => {
                    // Refetch logic can be added here
                }}
                investments={modalInvestments}
            />
        </div>
    );
}
