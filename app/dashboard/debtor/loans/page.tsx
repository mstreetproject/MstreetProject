'use client';

import React from 'react';
import StatsCard from '@/components/dashboard/StatsCard';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import { useDebtorLoans } from '@/hooks/dashboard/useDebtorLoans';
import { useCurrency } from '@/hooks/useCurrency';
import {
    DollarSign,
    Clock,
    CheckCircle,
    AlertTriangle,
    Calendar
} from 'lucide-react';
import styles from '../../internal/creditors/page.module.css';

// Format date helper
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, { bg: string; color: string }> = {
        active: { bg: 'var(--accent-bg)', color: 'var(--accent-primary)' },
        repaid: { bg: 'var(--success-bg)', color: 'var(--success)' },
        overdue: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
        defaulted: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
    };

    const style = colors[status] || colors.active;

    return (
        <span style={{
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 600,
            textTransform: 'capitalize',
            background: style.bg,
            color: style.color,
        }}>
            {status}
        </span>
    );
};

// Calculate maturity value
const calculateMaturity = (principal: number, rate: number, months: number) => {
    return principal + (principal * rate * months / 12 / 100);
};

// Calculate remaining/accrued
const calculateAccrued = (principal: number, rate: number, startDate: string) => {
    const start = new Date(startDate);
    const today = new Date();
    const daysElapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return principal + (principal * rate * daysElapsed / 365 / 100);
};

export default function LoansPage() {
    const { loans, stats, loading } = useDebtorLoans();
    const { formatCurrency } = useCurrency();

    // Table columns
    const columns: Column[] = [
        {
            key: 'principal',
            label: 'Principal',
            render: (value) => <strong>{formatCurrency(value)}</strong>
        },
        {
            key: 'interest_rate',
            label: 'Interest Rate',
            render: (value) => `${value}% p.a.`
        },
        {
            key: 'tenure_months',
            label: 'Term',
            render: (value) => `${value} months`
        },
        {
            key: 'start_date',
            label: 'Start Date',
            render: (value) => formatDate(value)
        },
        {
            key: 'end_date',
            label: 'Due Date',
            render: (value) => formatDate(value)
        },
        {
            key: 'current_balance',
            label: 'Current Balance',
            render: (_, row) => formatCurrency(calculateAccrued(row.principal, row.interest_rate, row.start_date))
        },
        {
            key: 'maturity_value',
            label: 'Maturity Value',
            render: (_, row) => formatCurrency(calculateMaturity(row.principal, row.interest_rate, row.tenure_months))
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => <StatusBadge status={value} />
        },
    ];

    // Show loading state matching internal dashboard
    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading loans...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.pageTitle}>My Loans</h1>
                    <p className={styles.pageSubtitle}>View all your loan details and payment history</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <StatsCard
                    title="Total Borrowed"
                    value={formatCurrency(stats.totalBorrowed)}
                    change={`${stats.totalLoans} loans total`}
                    changeType="neutral"
                    icon={DollarSign}
                    loading={loading}
                />
                <StatsCard
                    title="Active Loans"
                    value={stats.activeLoans.toString()}
                    change="Currently running"
                    changeType="neutral"
                    icon={Clock}
                    loading={loading}
                />
                <StatsCard
                    title="Outstanding Balance"
                    value={formatCurrency(stats.totalOutstanding)}
                    change="To be repaid"
                    changeType="negative"
                    icon={AlertTriangle}
                    loading={loading}
                />
                <StatsCard
                    title="Total Repaid"
                    value={formatCurrency(stats.repaidAmount)}
                    change="Completed"
                    changeType="positive"
                    icon={CheckCircle}
                    loading={loading}
                />
            </div>

            {/* Loans Table */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Loan Details</h2>
                <DataTable
                    columns={columns}
                    data={loans}
                    loading={loading}
                    emptyMessage="You don't have any loans yet"
                    searchable
                    searchKeys={['status']}
                    paginated
                    defaultPageSize={10}
                />
            </div>
        </div>
    );
}
