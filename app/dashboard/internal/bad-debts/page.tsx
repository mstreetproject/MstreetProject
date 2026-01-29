'use client';

import React from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import { useUser } from '@/hooks/dashboard/useUser';
import { useBadDebts, BadDebt } from '@/hooks/dashboard/useBadDebts';
import { useCurrency } from '@/hooks/useCurrency';
import { AlertCircle, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import sharedStyles from '../creditors/page.module.css';
import styles from './page.module.css';
import DataTable, { Column } from '@/components/dashboard/DataTable';

// Format date
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

// Status badge component
const StatusBadge = ({ isRecovered, recoveryPercent }: { isRecovered: boolean; recoveryPercent: number }) => {
    if (isRecovered) {
        return (
            <span className={`${styles.statusBadge} ${styles.recovered}`}>
                <CheckCircle size={14} />
                Recovered
            </span>
        );
    }
    if (recoveryPercent > 0) {
        return (
            <span className={`${styles.statusBadge} ${styles.partial}`}>
                {recoveryPercent.toFixed(0)}% Partial
            </span>
        );
    }
    return (
        <span className={`${styles.statusBadge} ${styles.outstanding}`}>
            Outstanding
        </span>
    );
};

export default function BadDebtsPage() {
    const { user, loading: userLoading } = useUser();
    const { badDebts, stats, loading, error } = useBadDebts();
    const { formatCurrency } = useCurrency();

    // RBAC Guard
    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'ops_officer', 'risk_officer'].includes(role.name)
    );

    if (userLoading || loading) {
        return (
            <div className={sharedStyles.loading}>
                <div className={sharedStyles.spinner}></div>
                <p>Loading bad debts...</p>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className={sharedStyles.error}>
                <h1>Access Denied</h1>
                <p>You do not have permission to view bad debts.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={sharedStyles.error}>
                <h1>Error</h1>
                <p>{error.message}</p>
            </div>
        );
    }

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={sharedStyles.container}>
                {/* Page Header */}
                <div className={sharedStyles.pageHeader}>
                    <div className={sharedStyles.headerLeft}>
                        <h1 className={sharedStyles.pageTitle}>Bad Debts Recovery</h1>
                        <p className={sharedStyles.pageSubtitle}>
                            Track non-performing loans and recovery progress
                        </p>
                    </div>
                    <div className={sharedStyles.headerRight}>
                        <div className={styles.netWriteOffCard}>
                            <AlertCircle size={24} style={{ opacity: 0.9 }} />
                            <div>
                                <div className={styles.label} style={{ fontSize: '0.7rem', fontWeight: 500, opacity: 0.85 }}>Net Write-Off</div>
                                <div className={styles.value} style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                                    {formatCurrency(stats.outstandingAmount)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className={sharedStyles.statsGrid}>
                    <StatsCard
                        title="Total Written Off"
                        value={formatCurrency(stats.totalAmount)}
                        change={`${stats.totalCount} debts`}
                        changeType="negative"
                        icon={AlertCircle}
                        loading={loading}
                    />
                    <StatsCard
                        title="Recovered"
                        value={formatCurrency(stats.recoveredAmount)}
                        change={`${stats.recoveredCount} recovered`}
                        changeType="positive"
                        icon={CheckCircle}
                        loading={loading}
                    />
                    <StatsCard
                        title="Outstanding"
                        value={formatCurrency(stats.outstandingAmount)}
                        change={`${stats.outstandingCount} pending`}
                        changeType="negative"
                        icon={Clock}
                        loading={loading}
                    />
                    <StatsCard
                        title="Recovery Rate"
                        value={stats.totalAmount > 0 ? `${((stats.recoveredAmount / stats.totalAmount) * 100).toFixed(1)}%` : '0%'}
                        change="of written off"
                        changeType={stats.recoveredAmount > 0 ? 'positive' : 'neutral'}
                        icon={TrendingUp}
                        loading={loading}
                    />
                </div>

                {/* Bad Debts Section */}
                <div className={sharedStyles.section}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 className={sharedStyles.sectionTitle}>All Bad Debts</h2>
                    </div>

                    {badDebts.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-primary)',
                        }}>
                            <AlertCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>No Bad Debts</h3>
                            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                                There are no loans marked as non-performing (full provision required). Good job!
                            </p>
                        </div>
                    ) : (
                        <DataTable
                            columns={[
                                {
                                    key: 'debtor',
                                    label: 'Debtor',
                                    render: (_, row: BadDebt) => (
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {row.loan?.debtor?.full_name || 'Unknown'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {row.loan?.debtor?.email || '—'}
                                            </div>
                                        </div>
                                    )
                                },
                                {
                                    key: 'amount',
                                    label: 'Original Amount',
                                    render: (val) => <div style={{ textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>{formatCurrency(val)}</div>
                                },
                                {
                                    key: 'recovered_amount',
                                    label: 'Recovered',
                                    render: (val) => <div style={{ textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{formatCurrency(val || 0)}</div>
                                },
                                {
                                    key: 'remaining',
                                    label: 'Remaining',
                                    render: (_, row: BadDebt) => {
                                        const remaining = Number(row.amount || 0) - Number(row.recovered_amount || 0);
                                        return <div style={{ textAlign: 'right', fontWeight: 600, color: remaining > 0 ? '#f59e0b' : '#10b981' }}>{formatCurrency(remaining)}</div>
                                    }
                                },
                                {
                                    key: 'status',
                                    label: 'Status',
                                    render: (_, row: BadDebt) => {
                                        const recoveryPercent = Number(row.amount) > 0 ? ((Number(row.recovered_amount) || 0) / Number(row.amount) * 100) : 0;
                                        return (
                                            <div style={{ textAlign: 'center' }}>
                                                <StatusBadge isRecovered={row.is_fully_recovered} recoveryPercent={recoveryPercent} />
                                            </div>
                                        );
                                    }
                                },
                                {
                                    key: 'declared_date',
                                    label: 'Declared',
                                    render: (val) => formatDate(val)
                                }
                            ]}
                            data={badDebts}
                            loading={loading}
                            emptyMessage="No bad debts found"
                            searchable
                            searchKeys={['loan.debtor.full_name', 'loan.debtor.email']}
                            paginated
                            defaultPageSize={10}
                        />
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
