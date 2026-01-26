'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DataTable, { Column, RowAction } from '@/components/dashboard/DataTable';
import { useUser } from '@/hooks/dashboard/useUser';
import { useAllPaymentUploads } from '@/hooks/dashboard/useAllPaymentUploads';
import { useCurrency } from '@/hooks/useCurrency';
import {
    FileCheck,
    CheckCircle,
    XCircle,
    Eye,
    Clock,
    FileText,
    Trash2
} from 'lucide-react';
import styles from '../creditors/page.module.css';
import MStreetLoader from '@/components/ui/MStreetLoader';

// Format date helper
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

// Status badge
const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, { bg: string; color: string }> = {
        pending: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
        approved: { bg: 'var(--success-bg)', color: 'var(--success)' },
        rejected: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
    };
    const style = colors[status] || colors.pending;

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

export default function PaymentReviewsPage() {
    const { user, loading: userLoading } = useUser();
    const { uploads, loading, updateStatus, archiveUpload, refetch } = useAllPaymentUploads();
    const { formatCurrency } = useCurrency();
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [archivingId, setArchivingId] = useState<string | null>(null);

    // Check permissions
    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'ops_officer'].includes(role.name)
    );

    if (userLoading) {
        return (
            <div className={styles.loading}>
                <MStreetLoader size={120} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Loading payment reviews...
                </p>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className={styles.error}>
                <h1>Access Denied</h1>
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

    // Handle approve
    const handleApprove = async (row: any) => {
        try {
            await updateStatus(row.id, 'approved', notes || 'Payment verified and approved');
            setReviewingId(null);
            setNotes('');
            alert('Payment approved successfully!');
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    // Handle reject
    const handleReject = async (row: any) => {
        const reason = prompt('Reason for rejection:');
        if (!reason) return;

        try {
            await updateStatus(row.id, 'rejected', reason);
            alert('Payment rejected.');
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    // Handle archive
    const handleArchive = async (row: any) => {
        const reason = prompt(`Archive this payment upload from ${row.debtor?.full_name}?\n\nEnter reason (optional):`);
        if (reason !== null) {
            setArchivingId(row.id);
            try {
                await archiveUpload(row.id, reason || 'Archived by admin');
                alert('Payment upload archived! It can be restored from the Archive page.');
            } catch (err: any) {
                alert('Error: ' + err.message);
            } finally {
                setArchivingId(null);
            }
        }
    };

    // Stats
    const pendingCount = uploads.filter(u => u.status === 'pending').length;
    const approvedCount = uploads.filter(u => u.status === 'approved').length;
    const rejectedCount = uploads.filter(u => u.status === 'rejected').length;

    // Table columns
    const columns: Column[] = [
        {
            key: 'debtor',
            label: 'Debtor',
            render: (_, row) => (
                <div>
                    <strong>{row.debtor?.full_name || 'Unknown'}</strong>
                    <br />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {row.debtor?.email}
                    </span>
                </div>
            )
        },
        {
            key: 'loan',
            label: 'Loan',
            render: (_, row) => row.loan ? formatCurrency(row.loan.principal) : '-'
        },
        {
            key: 'file_name',
            label: 'File',
            render: (value, row) => (
                <a
                    href={row.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent-primary)' }}
                >
                    {value}
                </a>
            )
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

    // Row actions
    const rowActions: RowAction[] = [
        {
            label: 'View File',
            icon: <Eye size={16} />,
            onClick: (row) => window.open(row.file_url, '_blank'),
        },
        {
            label: 'Approve',
            icon: <CheckCircle size={16} />,
            onClick: handleApprove,
            hidden: (row) => row.status !== 'pending',
        },
        {
            label: 'Reject',
            icon: <XCircle size={16} />,
            onClick: handleReject,
            variant: 'danger',
            hidden: (row) => row.status !== 'pending',
        },
        {
            label: archivingId ? 'Archiving...' : '📦 Archive',
            icon: archivingId ? <MStreetLoader size={16} color="var(--danger)" /> : <Trash2 size={16} />,
            onClick: handleArchive,
            variant: 'danger',
        },
    ];

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>Payment Evidence Review</h1>
                        <p className={styles.pageSubtitle}>Review and approve payment proofs from debtors</p>
                    </div>
                </div>

                {/* Stats */}
                <div style={{
                    display: 'flex',
                    gap: '16px',
                    marginBottom: '24px',
                    flexWrap: 'wrap',
                }}>
                    <div style={{
                        padding: '16px 24px',
                        background: 'var(--warning-bg)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}>
                        <Clock size={24} style={{ color: 'var(--warning)' }} />
                        <div>
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)', margin: 0 }}>
                                {pendingCount}
                            </p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Pending</p>
                        </div>
                    </div>

                    <div style={{
                        padding: '16px 24px',
                        background: 'var(--success-bg)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}>
                        <CheckCircle size={24} style={{ color: 'var(--success)' }} />
                        <div>
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)', margin: 0 }}>
                                {approvedCount}
                            </p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Approved</p>
                        </div>
                    </div>

                    <div style={{
                        padding: '16px 24px',
                        background: 'var(--danger-bg)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}>
                        <XCircle size={24} style={{ color: 'var(--danger)' }} />
                        <div>
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)', margin: 0 }}>
                                {rejectedCount}
                            </p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Rejected</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>All Payment Uploads</h2>
                    <DataTable
                        columns={columns}
                        data={uploads}
                        loading={loading}
                        emptyMessage="No payment uploads yet"
                        searchable
                        searchKeys={['file_name', 'status']}
                        paginated
                        defaultPageSize={10}
                        actions={rowActions}
                    />
                </div>
            </div>
        </DashboardLayout>
    );
}
