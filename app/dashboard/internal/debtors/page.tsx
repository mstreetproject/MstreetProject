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
import { TrendingUp, DollarSign, Users, AlertCircle, CheckCircle, Wallet, PiggyBank } from 'lucide-react';
import styles from '../creditors/page.module.css';

// Format date
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

// Status badge
const StatusBadge = ({ status }: { status: string }) => {
    const getStatusClass = () => {
        switch (status) {
            case 'active':
                return styles.statusActive;
            case 'repaid':
                return styles.statusSuccess;
            case 'overdue':
            case 'defaulted':
                return styles.statusDanger;
            default:
                return styles.statusNeutral;
        }
    };

    return (
        <span className={`${styles.statusBadge} ${getStatusClass()}`}>
            {status}
        </span>
    );
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
        setSelectedDebtor
    } = useDebtorStats('month');
    const { counts: userCounts } = useUserCounts();
    const { formatCurrency } = useCurrency();

    // RBAC Guard
    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'ops_officer', 'risk_officer'].includes(role.name)
    );

    if (userLoading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading...</p>
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

    // Table columns
    const columns: Column[] = [
        {
            key: 'debtor_name',
            label: 'Debtor',
            render: (_, row) => row.debtor?.full_name || 'N/A'
        },
        {
            key: 'principal',
            label: 'Amount',
            render: (value) => formatCurrency(value)
        },
        {
            key: 'interest_rate',
            label: 'Rate',
            render: (value) => `${value}%`
        },
        {
            key: 'tenure_months',
            label: 'Tenure',
            render: (value) => `${value}mo`
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => <StatusBadge status={value} />
        },
        {
            key: 'created_at',
            label: 'Date',
            render: (value) => formatDate(value)
        },
    ];

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={styles.container}>
                {/* Page Header */}
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>Debtors Management</h1>
                        <p className={styles.pageSubtitle}>
                            {selectedDebtorInfo
                                ? `Viewing: ${selectedDebtorInfo.full_name}`
                                : 'Manage all debtors and their loans'}
                        </p>
                    </div>
                    <div className={styles.headerRight}>
                        {/* Debtors Count Badge */}
                        <div className={styles.creditorsCount}>
                            <Users size={20} />
                            <span className={styles.countValue}>{userCounts.debtorCount}</span>
                            <span className={styles.countLabel}>Debtors</span>
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
                        title="Active Loans"
                        value={stats.activeCount}
                        change={formatCurrency(stats.activeValue)}
                        changeType="neutral"
                        icon={TrendingUp}
                        loading={loansLoading}
                    />
                    <StatsCard
                        title="Repaid"
                        value={stats.repaidCount}
                        change={formatCurrency(stats.repaidValue)}
                        changeType="positive"
                        icon={CheckCircle}
                        loading={loansLoading}
                    />
                    <StatsCard
                        title="Overdue"
                        value={stats.overdueCount}
                        change={formatCurrency(stats.overdueValue)}
                        changeType="negative"
                        icon={AlertCircle}
                        loading={loansLoading}
                    />
                    <StatsCard
                        title="Bad Debt"
                        value={stats.badDebtCount}
                        change={formatCurrency(stats.badDebtValue)}
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
                    <DataTable
                        columns={columns}
                        data={loans}
                        loading={loansLoading}
                        emptyMessage="No loans found"
                        searchable
                        searchPlaceholder="Search loans..."
                        searchKeys={['debtor.full_name', 'debtor.email', 'status']}
                        paginated
                        defaultPageSize={10}
                    />
                </div>
            </div>
        </DashboardLayout>
    );
}
