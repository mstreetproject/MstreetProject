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
import { TrendingUp, DollarSign, Users, AlertCircle, CheckCircle, Wallet, PiggyBank, Edit, Trash2, Loader2, FileText } from 'lucide-react';
import styles from '../creditors/page.module.css';
import EditLoanModal from '@/components/dashboard/EditLoanModal';
import RecordRepaymentModal from '@/components/dashboard/RecordRepaymentModal';
import LoanHistoryModal from '@/components/dashboard/LoanHistoryModal';
import LoanDetailsModal from '@/components/dashboard/LoanDetailsModal';
import { createClient } from '@/lib/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';
import { RowAction } from '@/components/dashboard/DataTable';
import { useState } from 'react';

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

    // Modal State
    const [editingLoan, setEditingLoan] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [repaymentLoan, setRepaymentLoan] = useState<any>(null);
    const [showRepaymentModal, setShowRepaymentModal] = useState(false);
    const [historyLoanId, setHistoryLoanId] = useState<string | null>(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [archivingId, setArchivingId] = useState<string | null>(null);

    // Details Modal State
    const [selectedLoan, setSelectedLoan] = useState<any>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Handlers
    const handleRowClick = (row: any) => {
        // Prevent modal open if clicking action button happens automatically via event propagation? 
        // DataTable might handle this, usually row click catches everything unless stopPropagation is used on buttons.
        setSelectedLoan(row);
        setShowDetailsModal(true);
    };

    const handleEdit = (row: any) => {
        setEditingLoan(row);
        setShowEditModal(true);
    };

    const handleRepayment = (row: any) => {
        setRepaymentLoan(row);
        setShowRepaymentModal(true);
    };

    const handleViewHistory = (row: any) => {
        setHistoryLoanId(row.id);
        setShowHistoryModal(true);
    };

    const handleArchive = async (row: any) => {
        const reason = prompt(`Archive this loan for ${row.debtor?.full_name}?\n\nEnter reason (optional):`);
        if (reason !== null) {
            setArchivingId(row.id);
            try {
                const supabase = createClient();
                const { error } = await supabase
                    .from('loans')
                    .update({
                        status: 'archived', // Assuming 'archived' status or add a separate column
                        // archived_at: new Date().toISOString(), // If column exists
                    })
                    .eq('id', row.id);

                if (error) throw error;

                await logActivity('UPDATE_LOAN', 'loan', row.id, {
                    status: 'archived',
                    reason: reason || 'Archived by admin'
                });

                alert('Loan archived!');
                refetch();
            } catch (err: any) {
                alert(`Error archiving loan: ${err.message}`);
            } finally {
                setArchivingId(null);
            }
        }
    };

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
            render: (_, row) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{row.debtor?.full_name || 'N/A'}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.debtor?.email}</span>
                </div>
            )
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
            render: (value) => {
                const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
                    active: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', label: 'Active' },
                    partial_repaid: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', label: 'Partial' },
                    repaid: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Repaid' },
                    overdue: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: 'Overdue' },
                    defaulted: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'Defaulted' },
                    archived: { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280', label: 'Archived' },
                };
                const style = statusStyles[value] || statusStyles.active;
                return (
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: style.bg,
                        color: style.color,
                        textTransform: 'capitalize',
                    }}>
                        {style.label}
                    </span>
                );
            }
        },
    ];

    // Row Actions
    const rowActions: RowAction[] = [
        {
            label: '💰 Record Repayment',
            icon: <DollarSign size={16} />,
            onClick: handleRepayment,
            hidden: (row) => row.status === 'repaid' || row.status === 'archived',
        },
        {
            label: '📜 History',
            icon: <FileText size={16} />,
            onClick: handleViewHistory,
        },
        {
            label: 'Edit',
            icon: <Edit size={16} />,
            onClick: handleEdit,
            hidden: (row) => row.status === 'archived',
        },
        {
            label: archivingId ? 'Archiving...' : '📦 Archive',
            icon: archivingId ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />,
            onClick: handleArchive,
            variant: 'danger',
            hidden: (row) => row.status === 'archived',
        },
    ];

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
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        formatCurrency(stats.activeValue + stats.interestAccrued)
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
                        actions={rowActions}
                        onRowClick={handleRowClick}
                    />
                </div>
            </div>

            {/* Loan Details Modal */}
            <LoanDetailsModal
                isOpen={showDetailsModal}
                loan={selectedLoan}
                onClose={() => {
                    setShowDetailsModal(false);
                    setSelectedLoan(null);
                }}
            />

            {/* Edit Loan Modal */}
            <EditLoanModal
                isOpen={showEditModal}
                loan={editingLoan}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingLoan(null);
                }}
                onSuccess={() => {
                    refetch();
                }}
            />

            {/* Record Repayment Modal */}
            <RecordRepaymentModal
                isOpen={showRepaymentModal}
                loan={repaymentLoan}
                onClose={() => {
                    setShowRepaymentModal(false);
                    setRepaymentLoan(null);
                }}
                onSuccess={() => {
                    refetch();
                }}
            />

            {/* Loan History Modal */}
            <LoanHistoryModal
                isOpen={showHistoryModal}
                loanId={historyLoanId}
                onClose={() => {
                    setShowHistoryModal(false);
                    setHistoryLoanId(null);
                }}
            />
        </DashboardLayout>
    );
}
