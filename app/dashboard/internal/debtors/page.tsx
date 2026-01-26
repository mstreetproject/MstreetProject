'use client';

import React from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import StatsCard from '@/components/dashboard/StatsCard';
import TimePeriodFilter from '@/components/dashboard/TimePeriodFilter';
import DateRangeFilter from '@/components/dashboard/DateRangeFilter';
import DebtorFilter from '@/components/dashboard/DebtorFilter';
import { useUser } from '@/hooks/dashboard/useUser';
import { useDebtorStats } from '@/hooks/dashboard/useDebtorStats';
import { useUserCounts } from '@/hooks/dashboard/useUserCounts';
import { useCurrency } from '@/hooks/useCurrency';
import { TrendingUp, Users, Wallet, PiggyBank, CheckCircle, AlertCircle, UserPlus } from 'lucide-react';
import styles from '../creditors/page.module.css';
import { useActivityLog } from '@/hooks/useActivityLog';
import CreateDebtorModal from '@/components/dashboard/CreateDebtorModal';
import { useState } from 'react';
import RepaymentTable from '@/components/dashboard/RepaymentTable';
import MStreetLoader from '@/components/ui/MStreetLoader';

// Format date
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

export default function DebtorsPage() {
    const { user, loading: userLoading } = useUser();
    const {
        stats,
        loans,
        debtors,
        loading: loansLoading,
        timePeriod,
        setTimePeriod,
        dateRange,
        setDateRange,
        selectedDebtor,
        setSelectedDebtor,
        refetch
    } = useDebtorStats('month');
    const { counts: userCounts } = useUserCounts();
    const { formatCurrency } = useCurrency();
    const { logActivity } = useActivityLog();

    // Details Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);

    // RBAC Guard
    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'ops_officer', 'risk_officer'].includes(role.name)
    );

    if (userLoading) {
        return (
            <div className={styles.loading}>
                <MStreetLoader size={120} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Loading debtors...
                </p>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className={styles.error}>
                <h1>Access Denied</h1>
                <p>You do not have permission to view debtors.</p>
            </div>
        );
    }

    // Get selected debtor info
    const selectedDebtorInfo = selectedDebtor
        ? debtors.find(d => d.id === selectedDebtor)
        : null;


    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={styles.container}>
                {/* Page Header with Expected Revenue Card */}
                <div className={styles.pageHeader} style={{ alignItems: 'flex-start' }}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>Debtors Management</h1>
                        <p className={styles.pageSubtitle}>
                            {selectedDebtorInfo
                                ? `Viewing: ${selectedDebtorInfo.full_name}`
                                : 'Manage all debtors and their loans'}
                        </p>
                    </div>
                    <div className={styles.headerRight} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        {/* Create Debtor Button */}
                        <button
                            className={styles.createBtn}
                            onClick={() => setShowCreateModal(true)}
                        >
                            <UserPlus size={20} />
                            <span>Add Debtor</span>
                        </button>

                        {/* Debtors Count Badge */}
                        <div className={styles.creditorsCount}>
                            <Users size={20} />
                            <span className={styles.countValue}>{userCounts.debtorCount}</span>
                            <span className={styles.countLabel}>Debtors</span>
                        </div>

                        {/* Expected Revenue Card - Compact & Responsive */}
                        <div style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            color: 'white',
                            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                        }}>
                            <TrendingUp size={24} style={{ opacity: 0.9 }} />
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 500, opacity: 0.85, marginBottom: '2px' }}>Expected Revenue</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                                    {loansLoading ? (
                                        <MStreetLoader size={18} color="#ffffff" />
                                    ) : (
                                        formatCurrency(stats.performingValue + stats.interestAccrued)
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Row */}
                <div className={styles.filtersRow}>
                    <DebtorFilter
                        debtors={debtors}
                        value={selectedDebtor}
                        onChange={setSelectedDebtor}
                    />
                    <TimePeriodFilter
                        value={timePeriod}
                        onChange={setTimePeriod}
                    />
                    <DateRangeFilter
                        value={dateRange}
                        onChange={setDateRange}
                    />
                </div>

                {/* Stats Grid */}
                <div className={styles.statsGrid}>
                    <StatsCard
                        title="Total Value"
                        value={formatCurrency(stats.totalValue)}
                        icon={Wallet}
                        loading={loansLoading}
                    />
                    <StatsCard
                        title="Interest Accrued"
                        value={formatCurrency(stats.interestAccrued)}
                        changeType="positive"
                        icon={PiggyBank}
                        loading={loansLoading}
                    />
                    <StatsCard
                        title="Performing"
                        value={stats.performingCount}
                        change={formatCurrency(stats.performingValue)}
                        changeType="neutral"
                        icon={TrendingUp}
                        loading={loansLoading}
                    />
                    <StatsCard
                        title="Preliquidated"
                        value={stats.preliquidatedCount}
                        change={formatCurrency(stats.preliquidatedValue)}
                        changeType="positive"
                        icon={CheckCircle}
                        loading={loansLoading}
                    />
                    <StatsCard
                        title="Non-performing"
                        value={stats.nonPerformingCount}
                        change={formatCurrency(stats.nonPerformingValue)}
                        changeType="negative"
                        icon={AlertCircle}
                        loading={loansLoading}
                    />
                    <StatsCard
                        title="Full Provision"
                        value={stats.fullProvisionCount}
                        change={formatCurrency(stats.fullProvisionValue)}
                        changeType="negative"
                        icon={AlertCircle}
                        loading={loansLoading}
                    />
                </div>

                {/* Loans Table */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {selectedDebtorInfo
                            ? `Loans for ${selectedDebtorInfo.full_name}`
                            : 'All Loans'}
                    </h2>
                    <RepaymentTable
                        initialLoans={loans}
                        isLoading={loansLoading}
                        onRefresh={refetch}
                    />
                </div>
            </div>

            {/* Create Debtor Modal */}
            <CreateDebtorModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    refetch();
                    setShowCreateModal(false);
                }}
            />
        </DashboardLayout>
    );
}
