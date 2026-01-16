'use client';

import React from 'react';
import StatsCard from '@/components/dashboard/StatsCard';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import { useDebtorLoans } from '@/hooks/dashboard/useDebtorLoans';
import { usePaymentUploads } from '@/hooks/dashboard/usePaymentUploads';
import { useCurrency } from '@/hooks/useCurrency';
import {
    DollarSign,
    FileText,
    Clock,
    CheckCircle,
    AlertTriangle,
    Upload
} from 'lucide-react';
import styles from '../internal/creditors/page.module.css';

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
        pending: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
        approved: { bg: 'var(--success-bg)', color: 'var(--success)' },
        rejected: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
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

export default function DebtorDashboardPage() {
    const { loans, stats, loading: loansLoading } = useDebtorLoans();
    const { uploads, loading: uploadsLoading } = usePaymentUploads();
    const { formatCurrency } = useCurrency();

    // Loan columns
    const loanColumns: Column[] = [
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
            key: 'status',
            label: 'Status',
            render: (value) => <StatusBadge status={value} />
        },
    ];

    // Recent payments columns
    const paymentColumns: Column[] = [
        {
            key: 'file_name',
            label: 'File',
            render: (value) => <span style={{ color: 'var(--accent-primary)' }}>{value}</span>
        },
        {
            key: 'amount_paid',
            label: 'Amount',
            render: (value) => value ? formatCurrency(value) : '-'
        },
        {
            key: 'payment_date',
            label: 'Payment Date',
            render: (value) => value ? formatDate(value) : '-'
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => <StatusBadge status={value} />
        },
        {
            key: 'created_at',
            label: 'Uploaded',
            render: (value) => formatDate(value)
        },
    ];

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.pageTitle}>Welcome Back!</h1>
                    <p className={styles.pageSubtitle}>View your loans and payment history</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <StatsCard
                    title="Total Borrowed"
                    value={formatCurrency(stats.totalBorrowed)}
                    change={`${stats.totalLoans} loans`}
                    changeType="neutral"
                    icon={DollarSign}
                    loading={loansLoading}
                />
                <StatsCard
                    title="Active Loans"
                    value={stats.activeLoans.toString()}
                    change="In progress"
                    changeType="neutral"
                    icon={Clock}
                    loading={loansLoading}
                />
                <StatsCard
                    title="Outstanding"
                    value={formatCurrency(stats.totalOutstanding)}
                    changeType="negative"
                    icon={AlertTriangle}
                    loading={loansLoading}
                />
                <StatsCard
                    title="Repaid"
                    value={formatCurrency(stats.repaidAmount)}
                    changeType="positive"
                    icon={CheckCircle}
                    loading={loansLoading}
                />
            </div>

            {/* My Loans Table */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>My Loans</h2>
                <DataTable
                    columns={loanColumns}
                    data={loans}
                    loading={loansLoading}
                    emptyMessage="You don't have any loans yet"
                    paginated
                    defaultPageSize={5}
                />
            </div>

            {/* Recent Payment Uploads */}
            <div className={styles.section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Recent Payment Uploads</h2>
                    <a
                        href="/dashboard/debtor/payments"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--accent-primary)',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                        }}
                    >
                        <Upload size={16} />
                        Upload Payment
                    </a>
                </div>
                <DataTable
                    columns={paymentColumns}
                    data={uploads.slice(0, 5)}
                    loading={uploadsLoading}
                    emptyMessage="No payment uploads yet"
                />
            </div>
        </div>
    );
}
