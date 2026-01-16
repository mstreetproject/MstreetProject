'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DataTable, { Column, RowAction } from '@/components/dashboard/DataTable';
import { useUser } from '@/hooks/dashboard/useUser';
import { useAllLoanRequests } from '@/hooks/dashboard/useAllLoanRequests';
import { useCurrency } from '@/hooks/useCurrency';
import {
    FileCheck,
    CheckCircle,
    XCircle,
    Eye,
    Clock,
    User,
    X,
    ExternalLink,
    Trash2,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { useActivityLog } from '@/hooks/useActivityLog';
import styles from '../creditors/page.module.css';

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, { bg: string; color: string }> = {
        pending: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
        under_review: { bg: 'var(--accent-bg)', color: 'var(--accent-primary)' },
        approved: { bg: 'var(--success-bg)', color: 'var(--success)' },
        rejected: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
        disbursed: { bg: 'var(--success-bg)', color: 'var(--success)' },
        submitted: { bg: 'var(--accent-bg)', color: 'var(--accent-primary)' },
        verified: { bg: 'var(--success-bg)', color: 'var(--success)' },
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
            {status.replace('_', ' ')}
        </span>
    );
};

export default function LoanRequestsPage() {
    const { user, loading: userLoading } = useUser();
    const { logActivity } = useActivityLog();
    const { requests, loading, updateStatus, updateGuarantorStatus, archiveRequest } = useAllLoanRequests();
    const { formatCurrency } = useCurrency();
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [archivingId, setArchivingId] = useState<string | null>(null);

    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'ops_officer'].includes(role.name)
    );

    if (userLoading) {
        return <div className={styles.loading}><div className={styles.spinner}></div><p>Loading...</p></div>;
    }

    if (!hasAccess) {
        return <div className={styles.error}><h1>Access Denied</h1></div>;
    }

    const handleApprove = async (row: any) => {
        if (confirm('Approve this loan request?')) {
            await updateStatus(row.id, 'approved', 'Loan request approved');
            await logActivity('APPROVE_LOAN', 'loan', row.id, {
                note: 'Approved by admin'
            });
            alert('Approved!');
        }
    };

    const handleReject = async (row: any) => {
        const reason = prompt('Reason for rejection:');
        if (reason) {
            await updateStatus(row.id, 'rejected', reason);
            await logActivity('REJECT_LOAN', 'loan', row.id, {
                reason: reason
            });
            alert('Rejected');
        }
    };

    const handleArchive = async (row: any) => {
        const reason = prompt(`Archive this loan request from ${row.debtor?.full_name}?\n\nEnter reason (optional):`);
        if (reason !== null) { // User clicked OK (even if empty)
            setArchivingId(row.id);
            try {
                await archiveRequest(row.id, reason || 'Archived by admin');
                await logActivity('UPDATE_LOAN', 'loan', row.id, {
                    action: 'archive',
                    reason: reason || 'Archived by admin'
                });
                alert('Request archived! It can be restored from the Archive page.');
            } catch (err: any) {
                alert('Error: ' + err.message);
            } finally {
                setArchivingId(null);
            }
        }
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const approvedCount = requests.filter(r => r.status === 'approved').length;

    const columns: Column[] = [
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
                        overflow: 'hidden',
                    }}>
                        {row.debtor?.profile_picture_url ? (
                            <img src={row.debtor.profile_picture_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <User size={20} style={{ color: 'white' }} />
                        )}
                    </div>
                    <div>
                        <strong>{row.debtor?.full_name || 'Unknown'}</strong>
                        <br />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.debtor?.email}</span>
                    </div>
                </div>
            )
        },
        {
            key: 'amount_requested',
            label: 'Amount',
            render: (value) => <strong>{formatCurrency(value)}</strong>
        },
        {
            key: 'tenure_months',
            label: 'Term',
            render: (value) => `${value} months`
        },
        {
            key: 'guarantor_submissions',
            label: 'Guarantors',
            render: (value: any[]) => {
                const submitted = value?.filter(g => g.status === 'submitted' || g.status === 'verified').length || 0;
                const total = value?.length || 0;
                return (
                    <span style={{ color: submitted === total && total > 0 ? 'var(--success)' : 'var(--warning)' }}>
                        {submitted}/{total}
                    </span>
                );
            }
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => <StatusBadge status={value} />
        },
        {
            key: 'created_at',
            label: 'Requested',
            render: (value) => formatDate(value)
        },
    ];

    const rowActions: RowAction[] = [
        {
            label: 'View Details',
            icon: <Eye size={16} />,
            onClick: (row) => setSelectedRequest(row),
        },
        {
            label: 'Approve',
            icon: <CheckCircle size={16} />,
            onClick: handleApprove,
            hidden: (row) => row.status !== 'pending' && row.status !== 'under_review',
        },
        {
            label: 'Reject',
            icon: <XCircle size={16} />,
            onClick: handleReject,
            variant: 'danger',
            hidden: (row) => row.status !== 'pending' && row.status !== 'under_review',
        },
        {
            label: archivingId ? 'Archiving...' : '📦 Archive',
            icon: archivingId ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />,
            onClick: handleArchive,
            variant: 'danger',
        },
    ];

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={styles.container}>
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>Loan Requests</h1>
                        <p className={styles.pageSubtitle}>Review and process loan applications</p>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <div style={{ padding: '16px 24px', background: 'var(--warning-bg)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Clock size={24} style={{ color: 'var(--warning)' }} />
                        <div>
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)', margin: 0 }}>{pendingCount}</p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Pending</p>
                        </div>
                    </div>
                    <div style={{ padding: '16px 24px', background: 'var(--success-bg)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <CheckCircle size={24} style={{ color: 'var(--success)' }} />
                        <div>
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)', margin: 0 }}>{approvedCount}</p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Approved</p>
                        </div>
                    </div>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>All Requests</h2>
                    <DataTable
                        columns={columns}
                        data={requests}
                        loading={loading}
                        emptyMessage="No loan requests yet"
                        searchable
                        searchKeys={['status']}
                        paginated
                        defaultPageSize={10}
                        actions={rowActions}
                    />
                </div>

                {/* Detail Modal */}
                {selectedRequest && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--border-primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                                <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Loan Request Details</h2>
                                <button onClick={() => setSelectedRequest(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Debtor Info */}
                            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                                <h3 style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>DEBTOR INFORMATION</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                    }}>
                                        {selectedRequest.debtor?.profile_picture_url ? (
                                            <img src={selectedRequest.debtor.profile_picture_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <User size={32} style={{ color: 'white' }} />
                                        )}
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>{selectedRequest.debtor?.full_name}</p>
                                        <p style={{ color: 'var(--text-muted)', margin: '4px 0' }}>{selectedRequest.debtor?.email}</p>
                                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>{selectedRequest.debtor?.phone || 'No phone'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Loan Details */}
                            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                                <h3 style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>LOAN DETAILS</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Amount Requested</p>
                                        <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.25rem', margin: '4px 0 0' }}>{formatCurrency(selectedRequest.amount_requested)}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Term</p>
                                        <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.25rem', margin: '4px 0 0' }}>{selectedRequest.tenure_months} months</p>
                                    </div>
                                </div>
                                {selectedRequest.purpose && (
                                    <div style={{ marginTop: '16px' }}>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Purpose</p>
                                        <p style={{ color: 'var(--text-primary)', margin: '4px 0 0' }}>{selectedRequest.purpose}</p>
                                    </div>
                                )}
                            </div>

                            {/* Rejection Reason */}
                            {selectedRequest.status === 'rejected' && selectedRequest.admin_notes && (
                                <div style={{
                                    background: 'var(--danger-bg)',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    marginBottom: '20px',
                                    border: '1px solid var(--danger)'
                                }}>
                                    <h3 style={{ color: 'var(--danger)', marginBottom: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <AlertCircle size={18} />
                                        REJECTION REASON
                                    </h3>
                                    <p style={{ color: 'var(--danger)', margin: 0 }}>{selectedRequest.admin_notes}</p>
                                </div>
                            )}

                            {/* Guarantors */}
                            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '20px' }}>
                                <h3 style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>GUARANTORS ({selectedRequest.guarantor_submissions?.length || 0})</h3>

                                {selectedRequest.guarantor_submissions?.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)' }}>No guarantors added yet</p>
                                ) : (
                                    <div style={{ display: 'grid', gap: '16px' }}>
                                        {selectedRequest.guarantor_submissions?.map((g: any, i: number) => (
                                            <div key={g.id} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border-primary)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                                    <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>Guarantor {i + 1}</h4>
                                                    <StatusBadge status={g.status} />
                                                </div>

                                                {g.status === 'pending' ? (
                                                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Awaiting submission from guarantor</p>
                                                ) : (
                                                    <>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                                                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Name: <span style={{ color: 'var(--text-primary)' }}>{g.full_name || '-'}</span></p>
                                                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Phone: <span style={{ color: 'var(--text-primary)' }}>{g.phone || '-'}</span></p>
                                                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Email: <span style={{ color: 'var(--text-primary)' }}>{g.email || '-'}</span></p>
                                                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Relationship: <span style={{ color: 'var(--text-primary)' }}>{g.relationship || '-'}</span></p>
                                                        </div>

                                                        {/* Photos */}
                                                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                            {g.selfie_url && (
                                                                <a href={g.selfie_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                                                                    <img src={g.selfie_url} alt="Selfie" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                                                                    <p style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', margin: '4px 0 0', textAlign: 'center' }}>Selfie</p>
                                                                </a>
                                                            )}
                                                            {g.id_document_url && (
                                                                <a href={g.id_document_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                                                                    <div style={{ width: '80px', height: '80px', background: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <ExternalLink size={24} style={{ color: 'var(--accent-primary)' }} />
                                                                    </div>
                                                                    <p style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', margin: '4px 0 0', textAlign: 'center' }}>ID Doc</p>
                                                                </a>
                                                            )}
                                                        </div>

                                                        {/* Verify Button */}
                                                        {g.status === 'submitted' && (
                                                            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                                                <button
                                                                    onClick={async () => {
                                                                        await updateGuarantorStatus(g.id, 'verified');
                                                                        setSelectedRequest({ ...selectedRequest });
                                                                    }}
                                                                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--success)', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                                                                >
                                                                    Verify
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        const reason = prompt('Rejection reason:');
                                                                        if (reason) await updateGuarantorStatus(g.id, 'rejected', reason);
                                                                    }}
                                                                    style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem' }}
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            {(selectedRequest.status === 'pending' || selectedRequest.status === 'under_review') && (
                                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                    <button
                                        onClick={() => { handleApprove(selectedRequest); setSelectedRequest(null); }}
                                        style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: 'var(--success)', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Approve Loan
                                    </button>
                                    <button
                                        onClick={() => { handleReject(selectedRequest); setSelectedRequest(null); }}
                                        style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
