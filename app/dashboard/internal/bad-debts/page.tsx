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
                            Track defaulted loans and recovery progress
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
                    <h2 className={sharedStyles.sectionTitle}>All Bad Debts</h2>

                    {badDebts.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            background: 'var(--card-bg)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                        }}>
                            <AlertCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>No Bad Debts</h3>
                            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                                There are no loans marked as defaulted. Good job!
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className={`${styles.tableContainer} ${styles.desktopTable}`}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr className={styles.tableHeader}>
                                            <th className={styles.tableHeaderCell}>Debtor</th>
                                            <th className={`${styles.tableHeaderCell} ${styles.alignRight}`}>Original Amount</th>
                                            <th className={`${styles.tableHeaderCell} ${styles.alignRight}`}>Recovered</th>
                                            <th className={`${styles.tableHeaderCell} ${styles.alignRight}`}>Remaining</th>
                                            <th className={`${styles.tableHeaderCell} ${styles.alignCenter}`}>Status</th>
                                            <th className={styles.tableHeaderCell}>Declared</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {badDebts.map((bd: BadDebt) => {
                                            const remaining = Number(bd.amount || 0) - Number(bd.recovered_amount || 0);
                                            const recoveryPercent = Number(bd.amount) > 0 ? ((Number(bd.recovered_amount) || 0) / Number(bd.amount) * 100) : 0;
                                            return (
                                                <tr key={bd.id} className={styles.tableRow}>
                                                    <td className={styles.tableCell}>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                            {bd.loan?.debtor?.full_name || 'Unknown'}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                            {bd.loan?.debtor?.email || '—'}
                                                        </div>
                                                    </td>
                                                    <td className={`${styles.tableCell} ${styles.alignRight}`} style={{ fontWeight: 600, color: '#ef4444' }}>
                                                        {formatCurrency(bd.amount)}
                                                    </td>
                                                    <td className={`${styles.tableCell} ${styles.alignRight}`} style={{ fontWeight: 600, color: '#10b981' }}>
                                                        {formatCurrency(bd.recovered_amount || 0)}
                                                    </td>
                                                    <td className={`${styles.tableCell} ${styles.alignRight}`} style={{ fontWeight: 600, color: remaining > 0 ? '#f59e0b' : '#10b981' }}>
                                                        {formatCurrency(remaining)}
                                                    </td>
                                                    <td className={`${styles.tableCell} ${styles.alignCenter}`}>
                                                        <StatusBadge isRecovered={bd.is_fully_recovered} recoveryPercent={recoveryPercent} />
                                                    </td>
                                                    <td className={styles.tableCell} style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                        {formatDate(bd.declared_date)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className={styles.mobileCards}>
                                {badDebts.map((bd: BadDebt) => {
                                    const remaining = Number(bd.amount || 0) - Number(bd.recovered_amount || 0);
                                    const recoveryPercent = Number(bd.amount) > 0 ? ((Number(bd.recovered_amount) || 0) / Number(bd.amount) * 100) : 0;
                                    return (
                                        <div key={bd.id} className={styles.mobileCard}>
                                            <div className={styles.mobileCardHeader}>
                                                <div>
                                                    <div className={styles.mobileCardDebtor}>
                                                        {bd.loan?.debtor?.full_name || 'Unknown'}
                                                    </div>
                                                    <div className={styles.mobileCardEmail}>
                                                        {bd.loan?.debtor?.email || '—'}
                                                    </div>
                                                </div>
                                                <StatusBadge isRecovered={bd.is_fully_recovered} recoveryPercent={recoveryPercent} />
                                            </div>

                                            <div className={styles.mobileCardGrid}>
                                                <div className={styles.mobileCardItem}>
                                                    <span className={styles.mobileCardLabel}>Original</span>
                                                    <span className={`${styles.mobileCardValue} ${styles.red}`}>
                                                        {formatCurrency(bd.amount)}
                                                    </span>
                                                </div>
                                                <div className={styles.mobileCardItem}>
                                                    <span className={styles.mobileCardLabel}>Recovered</span>
                                                    <span className={`${styles.mobileCardValue} ${styles.green}`}>
                                                        {formatCurrency(bd.recovered_amount || 0)}
                                                    </span>
                                                </div>
                                                <div className={styles.mobileCardItem}>
                                                    <span className={styles.mobileCardLabel}>Remaining</span>
                                                    <span className={`${styles.mobileCardValue} ${remaining > 0 ? styles.orange : styles.green}`}>
                                                        {formatCurrency(remaining)}
                                                    </span>
                                                </div>
                                                <div className={styles.mobileCardItem}>
                                                    <span className={styles.mobileCardLabel}>Declared</span>
                                                    <span className={styles.mobileCardValue} style={{ color: 'var(--text-muted)' }}>
                                                        {formatDate(bd.declared_date)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
