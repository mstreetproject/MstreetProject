'use client';

import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import TimePeriodFilter from '@/components/dashboard/TimePeriodFilter';
import DateRangeFilter from '@/components/dashboard/DateRangeFilter';
import { useUser } from '@/hooks/dashboard/useUser';
import { useDashboardStats } from '@/hooks/dashboard/useDashboardStats';
import { useRecentCredits } from '@/hooks/dashboard/useRecentCredits';
import { useRecentLoans } from '@/hooks/dashboard/useRecentLoans';
import { useRecentUsers } from '@/hooks/dashboard/useRecentUsers';
import { useAuditLogs } from '@/hooks/dashboard/useAuditLogs';
import { useCurrency } from '@/hooks/useCurrency';
import { TIME_PERIODS, TimePeriod, DateRange } from '@/hooks/dashboard/useCreditorStats';
import {
    Users,
    DollarSign,
    TrendingUp,
    Wallet,
    Receipt,
    AlertCircle
} from 'lucide-react';
import styles from './page.module.css';



// Format date
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
    const getStatusClass = () => {
        switch (status) {
            case 'active':
                return styles.statusActive;
            case 'matured':
            case 'repaid':
                return styles.statusSuccess;
            case 'withdrawn':
                return styles.statusNeutral;
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

export default function InternalDashboard() {
    const { user, loading: userLoading } = useUser();

    // State for filters
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
    const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });

    // Calculate effective date range
    const effectiveDateRange = useMemo(() => {
        if (dateRange.startDate || dateRange.endDate) {
            return dateRange;
        }

        if (timePeriod === 'all') {
            return { startDate: null, endDate: null };
        }

        const days = TIME_PERIODS[timePeriod].days;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        return { startDate, endDate };
    }, [timePeriod, dateRange]);

    // Handle filter changes
    const handleSetTimePeriod = (period: TimePeriod) => {
        setTimePeriod(period);
        setDateRange({ startDate: null, endDate: null });
    };

    const handleSetDateRange = (range: DateRange) => {
        setDateRange(range);
        if (range.startDate || range.endDate) {
            setTimePeriod('all');
        }
    };

    const { stats, loading: statsLoading } = useDashboardStats(
        effectiveDateRange.startDate,
        effectiveDateRange.endDate
    );
    const { credits, loading: creditsLoading } = useRecentCredits(5);
    const { loans, loading: loansLoading } = useRecentLoans(5);
    const { users, loading: usersLoading } = useRecentUsers(5);
    const { logs, loading: logsLoading } = useAuditLogs(10);
    const { formatCurrency } = useCurrency();

    // Check if user has access
    const hasAccess = user?.is_internal || user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'ops_officer', 'risk_officer'].includes(role.name)
    );

    if (userLoading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className={styles.error}>
                <h1>Access Denied</h1>
                <p>You do not have permission to view this dashboard.</p>
                <button
                    onClick={async () => {
                        const { createClient } = await import('@/lib/supabase/client');
                        const supabase = createClient();
                        await supabase.auth.signOut();
                        window.location.href = '/login';
                    }}
                    style={{
                        marginTop: '16px',
                        padding: '10px 20px',
                        background: 'var(--accent-primary)',
                        color: '#070757',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    Sign Out & Switch Account
                </button>
            </div>
        );
    }

    // Define table columns
    const creditColumns: Column[] = [
        {
            key: 'creditor',
            label: 'Creditor',
            render: (_, row) => row.creditor?.full_name || 'N/A'
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

    const loanColumns: Column[] = [
        {
            key: 'debtor',
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

    const userColumns: Column[] = [
        { key: 'full_name', label: 'Name' },
        { key: 'email', label: 'Email' },
        {
            key: 'is_creditor',
            label: 'Type',
            render: (_, row) => {
                const types = [];
                if (row.is_creditor) types.push('Creditor');
                if (row.is_debtor) types.push('Debtor');
                if (row.is_internal) types.push('Internal');
                return types.join(', ') || 'User';
            }
        },
        {
            key: 'created_at',
            label: 'Joined',
            render: (value) => formatDate(value)
        },
    ];

    const auditColumns: Column[] = [
        {
            key: 'user',
            label: 'User',
            render: (_, row) => row.user?.full_name || 'System'
        },
        { key: 'action', label: 'Action' },
        { key: 'entity_type', label: 'Entity' },
        {
            key: 'created_at',
            label: 'Time',
            render: (value) => new Date(value).toLocaleString()
        },
    ];

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={styles.container}>
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>Internal Dashboard</h1>
                        <p className={styles.pageSubtitle}>
                            Welcome back, {user?.full_name}
                        </p>
                    </div>
                    <div className={styles.headerRight}>
                        <div className={styles.usersCount}>
                            <Users size={20} />
                            <span className={styles.countValue}>{stats?.totalUsers || 0}</span>
                            <span className={styles.countLabel}>Users</span>
                        </div>
                    </div>
                </div>

                {/* Filters Row */}
                <div className={styles.filtersRow}>
                    <TimePeriodFilter
                        value={timePeriod}
                        onChange={handleSetTimePeriod}
                    />
                    <DateRangeFilter
                        value={dateRange}
                        onChange={handleSetDateRange}
                    />
                </div>

                {/* Stats Grid */}
                <div className={styles.statsGrid}>
                    <StatsCard
                        title="Active Credits"
                        value={stats ? stats.totalActiveCredits.count : 0}
                        change={stats ? formatCurrency(stats.totalActiveCredits.sum) : '$0'}
                        changeType="neutral"
                        icon={DollarSign}
                        loading={statsLoading}
                    />
                    <StatsCard
                        title="Active Loans"
                        value={stats ? stats.totalActiveLoans.count : 0}
                        change={stats ? formatCurrency(stats.totalActiveLoans.sum) : '$0'}
                        changeType="neutral"
                        icon={TrendingUp}
                        loading={statsLoading}
                    />
                    {user?.roles?.some(role => ['super_admin', 'finance_manager'].includes(role.name)) && (
                        <>
                            <StatsCard
                                title="Interest Earned"
                                value={stats ? formatCurrency(stats.totalInterestEarned) : '$0'}
                                changeType="positive"
                                icon={Wallet}
                                loading={statsLoading}
                            />
                            <StatsCard
                                title="Operating Expenses"
                                value={stats ? formatCurrency(stats.totalOperatingExpenses) : '$0'}
                                changeType="negative"
                                icon={Receipt}
                                loading={statsLoading}
                            />
                            <StatsCard
                                title="Bad Debt"
                                value={stats ? formatCurrency(stats.totalBadDebt.sum) : '$0'}
                                change={stats ? `${stats.totalBadDebt.count} loans` : undefined}
                                changeType="negative"
                                icon={AlertCircle}
                                loading={statsLoading}
                            />
                        </>
                    )}
                </div>

                {/* Recent Activity Grid */}
                <div className={styles.activityGrid}>
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Recent Credits</h2>
                        <DataTable
                            columns={creditColumns}
                            data={credits}
                            loading={creditsLoading}
                            emptyMessage="No credits found"
                        />
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Recent Loans</h2>
                        <DataTable
                            columns={loanColumns}
                            data={loans}
                            loading={loansLoading}
                            emptyMessage="No loans found"
                        />
                    </div>
                </div>

                {/* Users and Audit Logs */}
                {user?.roles?.some(role => ['super_admin', 'ops_officer'].includes(role.name)) && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Recent Users</h2>
                        <DataTable
                            columns={userColumns}
                            data={users}
                            loading={usersLoading}
                            emptyMessage="No users found"
                        />
                    </div>
                )}

                {user?.roles?.some(role => ['super_admin', 'risk_officer'].includes(role.name)) && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Audit Logs</h2>
                        <DataTable
                            columns={auditColumns}
                            data={logs}
                            loading={logsLoading}
                            emptyMessage="No audit logs found"
                        />
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
