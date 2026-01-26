'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DataTable, { Column, RowAction } from '@/components/dashboard/DataTable';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { useUser } from '@/hooks/dashboard/useUser';
import { useAllLoanRequests } from '@/hooks/dashboard/useAllLoanRequests';
import { usePayoutRequests } from '../../../../hooks/dashboard/usePayoutRequests';
import { useCurrency } from '@/hooks/useCurrency';
import {
    User,
    CheckCircle,
    XCircle,
    Banknote,
    CreditCard,
    Clock,
    DollarSign,
    Trash2
} from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import styles from './page.module.css';

export default function MoneyRequestsPage() {
    const { user, loading: userLoading } = useUser();
    const {
        requests: loanRequests,
        loading: loanLoading,
        updateStatus,
        archiveRequest: archiveLoan
    } = useAllLoanRequests();

    // NEW: Payout Requests Hook
    const {
        requests: payoutRequests,
        loading: payoutLoading,
        approveRequest: approvePayout,
        rejectRequest: rejectPayout,
        archiveRequest: archivePayout
    } = usePayoutRequests();

    const { formatCurrency } = useCurrency();
    const [activeTab, setActiveTab] = useState<'loan' | 'payout'>('loan');

    const isSuperAdmin = user?.roles?.some(role => role.name === 'super_admin');
    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'ops_officer'].includes(role.name)
    );

    if (userLoading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px'
            }}>
                <MStreetLoader size={120} />
                <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading user data...</p>
            </div>
        );
    }

    if (!hasAccess) {
        return <div className={styles.error}><h1>Access Denied</h1></div>;
    }

    // --- LOAN REQUESTS LOGIC ---
    const handleApproveLoan = async (row: any) => {
        if (confirm(`Approve loan request for ${row.debtor.full_name}?`)) {
            try {
                await updateStatus(row.id, 'approved');
                alert('Loan approved!');
            } catch (err: any) {
                alert('Error: ' + err.message);
            }
        }
    };

    const handleRejectLoan = async (row: any) => {
        const reason = prompt('Reason for rejection:');
        if (reason) {
            try {
                await updateStatus(row.id, 'rejected', reason);
                alert('Loan rejected.');
            } catch (err: any) {
                alert('Error: ' + err.message);
            }
        }
    };

    const handleArchiveLoan = async (row: any) => {
        const reason = prompt('Reason for archiving:');
        if (reason) {
            try {
                await archiveLoan(row.id, reason);
                alert('Loan archived.');
            } catch (err: any) {
                alert('Error: ' + err.message);
            }
        }
    };

    const loanColumns: Column[] = [
        {
            key: 'debtor',
            label: 'Debtor',
            render: (_, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className={styles.avatar}>
                        <User size={20} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <strong>{row.debtor?.full_name}</strong>
                        <div className={styles.subtext}>{row.debtor?.email}</div>
                    </div>
                </div>
            )
        },
        { key: 'amount_requested', label: 'Amount', render: (value) => formatCurrency(value) },
        { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
        { key: 'purpose', label: 'Purpose', render: (value) => value || '-' },
        {
            key: 'created_at',
            label: 'Date',
            render: (value) => new Date(value).toLocaleDateString()
        }
    ];

    const loanActions: RowAction[] = [
        {
            label: 'Approve',
            icon: <CheckCircle size={16} />,
            onClick: handleApproveLoan,
            hidden: (row) => row.status !== 'pending'
        },
        {
            label: 'Reject',
            icon: <XCircle size={16} />,
            variant: 'danger',
            onClick: handleRejectLoan,
            hidden: (row) => row.status !== 'pending'
        },
        {
            label: 'Archive',
            icon: <Trash2 size={16} />,
            variant: 'danger',
            onClick: handleArchiveLoan
        }
    ];

    // --- PAYOUT REQUESTS LOGIC ---
    const handleApprovePayout = async (row: any) => {
        if (confirm(`Approve payout of ${formatCurrency(row.amount)} for ${row.creditor.full_name}?`)) {
            try {
                await approvePayout(row);
                // No alert needed, optimistic update handles UI
            } catch (err: any) {
                alert('Error: ' + err.message);
            }
        }
    };

    const handleRejectPayout = async (row: any) => {
        const reason = prompt('Reason for rejection:');
        if (reason) {
            try {
                await rejectPayout(row.id, reason);
            } catch (err: any) {
                alert('Error: ' + err.message);
            }
        }
    };

    const handleArchivePayout = async (row: any) => {
        if (confirm(`Archive this payout request?`)) {
            try {
                await archivePayout(row.id);
            } catch (err: any) {
                alert('Error: ' + err.message);
            }
        }
    };

    const payoutColumns: Column[] = [
        {
            key: 'creditor',
            label: 'Creditor',
            render: (_, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className={styles.avatar} style={{ background: 'var(--success)' }}>
                        <Banknote size={20} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <strong>{row.creditor?.full_name}</strong>
                        <div className={styles.subtext}>{row.creditor?.email}</div>
                    </div>
                </div>
            )
        },
        { key: 'amount', label: 'Amount', render: (value) => formatCurrency(value) },
        { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
        {
            key: 'created_at',
            label: 'Requested',
            render: (value) => new Date(value).toLocaleDateString()
        },
        {
            key: 'notes',
            label: 'Notes',
            render: (value) => value || '-'
        }
    ];

    const payoutActions: RowAction[] = [
        {
            label: 'Approve & Pay',
            icon: <CheckCircle size={16} />,
            onClick: handleApprovePayout,
            hidden: (row) => row.status !== 'pending'
        },
        {
            label: 'Reject',
            icon: <XCircle size={16} />,
            variant: 'danger',
            onClick: handleRejectPayout,
            hidden: (row) => row.status !== 'pending'
        },
        {
            label: 'Archive',
            icon: <Trash2 size={16} />,
            variant: 'danger',
            onClick: handleArchivePayout
        }
    ];

    const pendingLoanCount = loanRequests.filter(r => r.status === 'pending').length;
    const pendingPayoutCount = payoutRequests.filter(r => r.status === 'pending').length;

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={styles.container}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Money Requests</h1>
                        <p className={styles.pageSubtitle}>Manage loan applications and payout requests</p>
                    </div>
                </div>

                {/* Operations-Style Tabs */}
                <div className={styles.tabsContainer}>
                    <div className={styles.tabs}>
                        <button
                            onClick={() => setActiveTab('loan')}
                            className={`${styles.tab} ${activeTab === 'loan' ? styles.activeTab : ''}`}
                        >
                            <CreditCard size={18} />
                            <span className={styles.tabLabel}>Loan Requests</span>
                            {pendingLoanCount > 0 && (
                                <span className={styles.badge}>
                                    {pendingLoanCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('payout')}
                            className={`${styles.tab} ${activeTab === 'payout' ? styles.activeTab : ''}`}
                        >
                            <DollarSign size={18} />
                            <span className={styles.tabLabel}>Payout Requests</span>
                            {pendingPayoutCount > 0 && (
                                <span className={styles.badge}>
                                    {pendingPayoutCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Content with Loader Overlay */}
                <div className={styles.section}>
                    {(activeTab === 'loan' ? loanLoading : payoutLoading) && (
                        <div className={styles.loadingOverlay}>
                            <MStreetLoader size={80} />
                            <p className={styles.loadingText} style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                Loading requests...
                            </p>
                        </div>
                    )}

                    {activeTab === 'loan' ? (
                        <>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}>Loan Applications</h2>
                            </div>
                            <DataTable
                                columns={loanColumns}
                                data={loanRequests}
                                loading={false} // Handled by overlay
                                actions={loanActions}
                                searchable
                                paginated
                                defaultPageSize={10}
                                emptyMessage="No loan requests found."
                            />
                        </>
                    ) : (
                        <>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}>Payout Requests</h2>
                                <div className={styles.infoBox} style={{ marginLeft: 'auto', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    <Clock size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                                    Process requests within 24 hours
                                </div>
                            </div>
                            <DataTable
                                columns={payoutColumns}
                                data={payoutRequests}
                                loading={false} // Handled by overlay
                                actions={payoutActions}
                                searchable
                                paginated
                                defaultPageSize={10}
                                emptyMessage="No payout requests found."
                            />
                        </>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
