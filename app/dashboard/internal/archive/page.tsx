'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DataTable, { Column, RowAction } from '@/components/dashboard/DataTable';
import { useUser } from '@/hooks/dashboard/useUser';
import { useAllLoanRequests } from '@/hooks/dashboard/useAllLoanRequests';
import { useAllPaymentUploads } from '@/hooks/dashboard/useAllPaymentUploads';
import { usePayoutRequests } from '../../../../hooks/dashboard/usePayoutRequests';
import { useCurrency } from '@/hooks/useCurrency';
import { useActivityLog } from '@/hooks/useActivityLog';
import { createClient } from '@/lib/supabase/client';
import {

    RefreshCw,
    Trash2,
    User,
    AlertCircle,
    Banknote
} from 'lucide-react';
import styles from '../creditors/page.module.css';
import MStreetLoader from '@/components/ui/MStreetLoader';

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const getDaysUntilDeletion = (archivedAt: string) => {
    const archived = new Date(archivedAt);
    const deleteDate = new Date(archived.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysLeft = Math.ceil((deleteDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return daysLeft;
};

export default function ArchivePage() {
    const { user, loading: userLoading } = useUser();
    const { archivedRequests, fetchArchivedRequests, restoreRequest, permanentlyDeleteRequest } = useAllLoanRequests();
    const { archivedUploads, fetchArchivedUploads, restoreUpload, permanentlyDeleteUpload } = useAllPaymentUploads();

    // Payout Hook
    const {
        archivedRequests: archivedPayouts,
        fetchArchivedRequests: fetchArchivedPayouts,
        restoreRequest: restorePayout,
        permanentlyDeleteRequest: permanentlyDeletePayout
    } = usePayoutRequests();

    const { formatCurrency } = useCurrency();
    const { logActivity } = useActivityLog();
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [archivedCredits, setArchivedCredits] = useState<any[]>([]);
    const [archivedLoans, setArchivedLoans] = useState<any[]>([]);

    const isSuperAdmin = user?.roles?.some(role => role.name === 'super_admin');
    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'ops_officer'].includes(role.name)
    );

    // Fetch archived credits
    const fetchArchivedCredits = useCallback(async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('credits')
            .select(`*, creditor:users!creditor_id(full_name, email)`)
            .not('archived_at', 'is', null)
            .order('archived_at', { ascending: false });
        if (!error) setArchivedCredits(data || []);
    }, []);

    // Fetch archived loans
    const fetchArchivedLoans = useCallback(async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('loans')
            .select(`*, debtor:users!debtor_id(full_name, email)`)
            .eq('status', 'archived')
            .order('created_at', { ascending: false });
        if (!error) setArchivedLoans(data || []);
    }, []);

    // Fetch archived data on mount
    useEffect(() => {
        if (hasAccess && !loaded) {
            Promise.all([
                fetchArchivedRequests(),
                fetchArchivedUploads(),
                fetchArchivedCredits(),
                fetchArchivedLoans(),
                fetchArchivedPayouts()
            ])
                .then(() => setLoaded(true));
        }
    }, [hasAccess, loaded, fetchArchivedRequests, fetchArchivedUploads, fetchArchivedCredits, fetchArchivedLoans, fetchArchivedPayouts]);

    if (userLoading) {
        return (
            <div className={styles.loading}>
                <MStreetLoader size={120} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Loading archive...
                </p>
            </div>
        );
    }

    if (!hasAccess) {
        return <div className={styles.error}><h1>Access Denied</h1></div>;
    }

    // --- HANDLERS ---

    // Loan request handlers
    const handleRestoreRequest = async (row: any) => {
        if (confirm(`Restore this loan request from ${row.debtor?.full_name}?`)) {
            setActionLoading(row.id);
            try {
                await restoreRequest(row.id);
                alert('Request restored!');
            } catch (err: any) {
                alert('Error: ' + err.message);
            } finally {
                setActionLoading(null);
            }
        }
    };

    const handlePermanentDeleteRequest = async (row: any) => {
        if (!isSuperAdmin) {
            alert('Only Super Admins can permanently delete.');
            return;
        }
        if (confirm(`⚠️ PERMANENT DELETE\n\nThis will permanently delete the loan request from ${row.debtor?.full_name}.\n\nThis action CANNOT be undone!`)) {
            setActionLoading(row.id);
            try {
                await permanentlyDeleteRequest(row.id);
                alert('Permanently deleted!');
            } catch (err: any) {
                alert('Error: ' + err.message);
            } finally {
                setActionLoading(null);
            }
        }
    };

    // Payment upload handlers
    const handleRestoreUpload = async (row: any) => {
        if (confirm(`Restore this payment upload from ${row.debtor?.full_name}?`)) {
            setActionLoading(row.id);
            try {
                await restoreUpload(row.id);
                alert('Payment upload restored!');
            } catch (err: any) {
                alert('Error: ' + err.message);
            } finally {
                setActionLoading(null);
            }
        }
    };

    const handlePermanentDeleteUpload = async (row: any) => {
        if (!isSuperAdmin) {
            alert('Only Super Admins can permanently delete.');
            return;
        }
        if (confirm(`⚠️ PERMANENT DELETE\n\nThis will permanently delete this payment upload.\n\nThis action CANNOT be undone!`)) {
            setActionLoading(row.id);
            try {
                await permanentlyDeleteUpload(row.id);
                alert('Permanently deleted!');
            } catch (err: any) {
                alert('Error: ' + err.message);
            } finally {
                setActionLoading(null);
            }
        }
    };

    // Credit handlers
    const handleRestoreCredit = async (row: any) => {
        if (confirm(`Restore this credit from ${row.creditor?.full_name}?`)) {
            setActionLoading(row.id);
            try {
                const supabase = createClient();
                const { error } = await supabase
                    .from('credits')
                    .update({ archived_at: null, archive_reason: null })
                    .eq('id', row.id);
                if (error) throw error;

                await logActivity('RESTORE_CREDIT', 'credit', row.id, {
                    creditor: row.creditor?.full_name,
                    principal: row.principal,
                });

                alert('Credit restored!');
                fetchArchivedCredits();
            } catch (err: any) {
                alert('Error: ' + err.message);
            } finally {
                setActionLoading(null);
            }
        }
    };

    const handlePermanentDeleteCredit = async (row: any) => {
        if (!isSuperAdmin) {
            alert('Only Super Admins can permanently delete.');
            return;
        }
        if (confirm(`⚠️ PERMANENT DELETE\n\nThis will permanently delete this credit.\n\nThis action CANNOT be undone!`)) {
            setActionLoading(row.id);
            try {
                await logActivity('DELETE_CREDIT', 'credit', row.id, {
                    creditor: row.creditor?.full_name,
                    principal: row.principal,
                    permanent: true,
                });
                const supabase = createClient();
                const { error } = await supabase.from('credits').delete().eq('id', row.id);
                if (error) throw error;
                alert('Permanently deleted!');
                fetchArchivedCredits();
            } catch (err: any) {
                alert('Error: ' + err.message);
            } finally {
                setActionLoading(null);
            }
        }
    };

    // Loan handlers
    const handleRestoreLoan = async (row: any) => {
        if (confirm(`Restore this loan from ${row.debtor?.full_name}?`)) {
            setActionLoading(row.id);
            try {
                const supabase = createClient();
                const { error } = await supabase
                    .from('loans')
                    .update({
                        status: 'active',
                        archived_at: null,
                        archive_reason: null
                    })
                    .eq('id', row.id);
                if (error) throw error;

                await logActivity('RESTORE_LOAN', 'loan', row.id, {
                    debtor: row.debtor?.full_name,
                    principal: row.principal,
                });

                alert('Loan restored!');
                fetchArchivedLoans();
            } catch (err: any) {
                alert('Error: ' + err.message);
            } finally {
                setActionLoading(null);
            }
        }
    };

    const handlePermanentDeleteLoan = async (row: any) => {
        if (!isSuperAdmin) {
            alert('Only Super Admins can permanently delete.');
            return;
        }
        if (confirm(`⚠️ PERMANENT DELETE\n\nThis will permanently delete this loan.\n\nThis action CANNOT be undone!`)) {
            setActionLoading(row.id);
            try {
                await logActivity('DELETE_LOAN', 'loan', row.id, {
                    debtor: row.debtor?.full_name,
                    principal: row.principal,
                    permanent: true,
                });
                const supabase = createClient();
                const { error } = await supabase.from('loans').delete().eq('id', row.id);
                if (error) throw error;
                alert('Permanently deleted!');
                fetchArchivedLoans();
            } catch (err: any) {
                alert('Error: ' + err.message);
            } finally {
                setActionLoading(null);
            }
        }
    };

    // Payout Handlers
    const handleRestorePayout = async (row: any) => {
        if (confirm(`Restore this payout request from ${row.creditor?.full_name}?`)) {
            setActionLoading(row.id);
            try {
                await restorePayout(row.id);
                alert('Payout restored!');
            } catch (err: any) {
                alert('Error: ' + err.message);
            } finally {
                setActionLoading(null);
            }
        }
    };

    const handlePermanentDeletePayout = async (row: any) => {
        if (!isSuperAdmin) {
            alert('Only Super Admins can permanently delete.');
            return;
        }
        if (confirm(`⚠️ PERMANENT DELETE\n\nThis will permanently delete this payout request.\n\nThis action CANNOT be undone!`)) {
            setActionLoading(row.id);
            try {
                await permanentlyDeletePayout(row.id);
                alert('Permanently deleted!');
            } catch (err: any) {
                alert('Error: ' + err.message);
            } finally {
                setActionLoading(null);
            }
        }
    };

    // --- COLUMNS ---

    const requestColumns: Column[] = [
        {
            key: 'debtor',
            label: 'Debtor',
            render: (_, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <User size={20} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <strong>{row.debtor?.full_name || 'Unknown'}</strong>
                        <br />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.debtor?.email}</span>
                    </div>
                </div>
            )
        },
        { key: 'amount_requested', label: 'Amount', render: (value) => <strong>{formatCurrency(value)}</strong> },
        { key: 'archive_reason', label: 'Reason', render: (value) => value || '-' },
        { key: 'archived_at', label: 'Archived', render: (value) => formatDate(value) },
        {
            key: 'archived_at',
            label: 'Days Left',
            render: (value) => {
                const days = getDaysUntilDeletion(value);
                return <span style={{ color: days <= 7 ? 'var(--danger)' : 'var(--text-muted)' }}>{days > 0 ? `${days}d` : 'Due'}</span>;
            }
        },
    ];

    const uploadColumns: Column[] = [
        {
            key: 'debtor',
            label: 'Debtor',
            render: (_, row) => (
                <div>
                    <strong>{row.debtor?.full_name || 'Unknown'}</strong>
                    <br />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.debtor?.email}</span>
                </div>
            )
        },
        { key: 'file_name', label: 'File', render: (value) => value },
        { key: 'amount_paid', label: 'Amount', render: (value) => value ? formatCurrency(value) : '-' },
        { key: 'archive_reason', label: 'Reason', render: (value) => value || '-' },
        { key: 'archived_at', label: 'Archived', render: (value) => formatDate(value) },
        {
            key: 'archived_at',
            label: 'Days Left',
            render: (value) => {
                const days = getDaysUntilDeletion(value);
                return <span style={{ color: days <= 7 ? 'var(--danger)' : 'var(--text-muted)' }}>{days > 0 ? `${days}d` : 'Due'}</span>;
            }
        },
    ];

    const creditColumns: Column[] = [
        {
            key: 'creditor',
            label: 'Creditor',
            render: (_, row) => (
                <div>
                    <strong>{row.creditor?.full_name || 'Unknown'}</strong>
                    <br />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.creditor?.email}</span>
                </div>
            )
        },
        { key: 'principal', label: 'Principal', render: (value) => formatCurrency(value) },
        { key: 'archive_reason', label: 'Reason', render: (value) => value || '-' },
        { key: 'archived_at', label: 'Archived', render: (value) => value ? formatDate(value) : '-' },
    ];

    const loanColumns: Column[] = [
        {
            key: 'debtor',
            label: 'Debtor',
            render: (_, row) => (
                <div>
                    <strong>{row.debtor?.full_name || 'Unknown'}</strong>
                    <br />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.debtor?.email}</span>
                </div>
            )
        },
        { key: 'principal', label: 'Principal', render: (value) => formatCurrency(value) },
        { key: 'archive_reason', label: 'Reason', render: (value) => value || '-' },
        { key: 'archived_at', label: 'Archived', render: (value) => value ? formatDate(value) : '-' },
    ];

    const payoutColumns: Column[] = [
        {
            key: 'creditor',
            label: 'Creditor',
            render: (_, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Banknote size={16} color="white" />
                    </div>
                    <div>
                        <strong>{row.creditor?.full_name}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.creditor?.email}</div>
                    </div>
                </div>
            )
        },
        { key: 'amount', label: 'Amount', render: (value) => formatCurrency(value) },
        { key: 'status', label: 'Status', render: (value) => <span className={styles.badge}>{value}</span> },
        { key: 'created_at', label: 'Requested', render: (value) => formatDate(value) },
    ];

    // --- ACTIONS ---

    const requestActions: RowAction[] = [
        {
            label: '↩️ Restore',
            icon: <RefreshCw size={16} />,
            onClick: handleRestoreRequest,
        },
        {
            label: '🗑️ Delete Forever',
            icon: <Trash2 size={16} />,
            onClick: handlePermanentDeleteRequest,
            variant: 'danger',
            hidden: () => !isSuperAdmin,
        },
    ];

    const uploadActions: RowAction[] = [
        {
            label: '↩️ Restore',
            icon: <RefreshCw size={16} />,
            onClick: handleRestoreUpload,
        },
        {
            label: '🗑️ Delete Forever',
            icon: <Trash2 size={16} />,
            onClick: handlePermanentDeleteUpload,
            variant: 'danger',
            hidden: () => !isSuperAdmin,
        },
    ];

    const creditActions: RowAction[] = [
        {
            label: '↩️ Restore',
            icon: <RefreshCw size={16} />,
            onClick: handleRestoreCredit,
        },
        {
            label: '🗑️ Delete Forever',
            icon: <Trash2 size={16} />,
            onClick: handlePermanentDeleteCredit,
            variant: 'danger',
            hidden: () => !isSuperAdmin,
        },
    ];

    const loanActions: RowAction[] = [
        {
            label: '↩️ Restore',
            icon: <RefreshCw size={16} />,
            onClick: handleRestoreLoan,
        },
        {
            label: '🗑️ Delete Forever',
            icon: <Trash2 size={16} />,
            onClick: handlePermanentDeleteLoan,
            variant: 'danger',
            hidden: () => !isSuperAdmin,
        },
    ];

    const payoutActions: RowAction[] = [
        {
            label: '↩️ Restore',
            icon: <RefreshCw size={16} />,
            onClick: handleRestorePayout,
        },
        {
            label: '🗑️ Delete Forever',
            icon: <Trash2 size={16} />,
            onClick: handlePermanentDeletePayout,
            variant: 'danger',
            hidden: () => !isSuperAdmin,
        },
    ];

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={styles.container}>
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>📦 Archive</h1>
                        <p className={styles.pageSubtitle}>Archived items (30-day retention)</p>
                    </div>
                </div>

                {/* Info Box */}
                <div style={{
                    background: 'var(--warning-bg)',
                    border: '1px solid var(--warning)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                }}>
                    <AlertCircle size={24} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                    <div>
                        <p style={{ color: 'var(--warning)', fontWeight: 600, margin: '0 0 4px' }}>
                            Archived items are automatically deleted after 30 days
                        </p>
                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                            Restore items to bring them back. Super admins can permanently delete at any time.
                        </p>
                    </div>
                </div>

                {/* Loan Requests Section */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Archived Loan Requests ({archivedRequests.length})</h2>
                    <DataTable
                        columns={requestColumns}
                        data={archivedRequests}
                        loading={!loaded}
                        emptyMessage="No archived loan requests"
                        searchable
                        paginated
                        defaultPageSize={10}
                        actions={requestActions}
                    />
                </div>

                {/* Payout Requests Section */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Archived Payout Requests ({archivedPayouts.length})</h2>
                    <DataTable
                        columns={payoutColumns}
                        data={archivedPayouts}
                        loading={!loaded}
                        emptyMessage="No archived payout requests"
                        searchable
                        paginated
                        defaultPageSize={10}
                        actions={payoutActions}
                    />
                </div>

                {/* Payment Uploads Section */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Archived Payment Uploads ({archivedUploads.length})</h2>
                    <DataTable
                        columns={uploadColumns}
                        data={archivedUploads}
                        loading={!loaded}
                        emptyMessage="No archived payment uploads"
                        searchable
                        paginated
                        defaultPageSize={10}
                        actions={uploadActions}
                    />
                </div>

                {/* Credits Section */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Archived Credits ({archivedCredits.length})</h2>
                    <DataTable
                        columns={creditColumns}
                        data={archivedCredits}
                        loading={!loaded}
                        emptyMessage="No archived credits"
                        searchable
                        paginated
                        defaultPageSize={10}
                        actions={creditActions}
                    />
                </div>

                {/* Loans Section */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Archived Loans ({archivedLoans.length})</h2>
                    <DataTable
                        columns={loanColumns}
                        data={archivedLoans}
                        loading={!loaded}
                        emptyMessage="No archived loans"
                        searchable
                        paginated
                        defaultPageSize={10}
                        actions={loanActions}
                    />
                </div>
            </div>
        </DashboardLayout>
    );
}
