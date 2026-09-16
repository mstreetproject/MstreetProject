'use client';

import React, { useState, useEffect } from 'react';
import { useLoanRequests } from '@/hooks/dashboard/useLoanRequests';
import { useSystemSettings } from '@/hooks/dashboard/useSystemSettings';
import { useCurrency } from '@/hooks/useCurrency';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import {
    Plus,
    Clock,
    CheckCircle,
    XCircle,
    Send,
    Link as LinkIcon,
    Copy,
    X,
    User,
    Trash2,
    AlertCircle,
    Users
} from 'lucide-react';
import styles from '../../internal/creditors/page.module.css';
import MStreetLoader from '@/components/ui/MStreetLoader';

// Format date
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
        under_review: { bg: 'var(--accent-bg)', color: 'var(--accent-primary)' },
        approved: { bg: 'var(--success-bg)', color: 'var(--success)' },
        rejected: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
        disbursed: { bg: 'var(--success-bg)', color: 'var(--success)' },
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

export default function RequestLoanPage() {
    const { requests, loading, createRequest, updateRequest, addGuarantor, getGuarantorLink, deleteLoanRequest, deleteGuarantor, refetch } = useLoanRequests();
    const { settings, loading: settingsLoading, getRequiredGuarantors, validateAmount } = useSystemSettings();
    const { formatCurrency } = useCurrency();

    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showGuarantorForm, setShowGuarantorForm] = useState<string | null>(null);
    const [copiedLink, setCopiedLink] = useState<string | null>(null);
    const [deletingRequest, setDeletingRequest] = useState<string | null>(null);
    const [deletingGuarantor, setDeletingGuarantor] = useState<string | null>(null);
    const [requiredGuarantors, setRequiredGuarantors] = useState(0);
    const [amountError, setAmountError] = useState<string | null>(null);
    const [editingRequest, setEditingRequest] = useState<any | null>(null);

    const [loanForm, setLoanForm] = useState({
        amount_requested: '',
        tenure_months: '',
        purpose: '',
    });

    const [guarantorForm, setGuarantorForm] = useState({
        full_name: '',
        email: '',
        phone: '',
        relationship: '',
    });

    // Update required guarantors when amount changes
    useEffect(() => {
        const amount = parseFloat(loanForm.amount_requested) || 0;
        if (amount > 0) {
            const validation = validateAmount(amount);
            if (!validation.valid) {
                setAmountError(validation.message || null);
                setRequiredGuarantors(0);
            } else {
                setAmountError(null);
                setRequiredGuarantors(getRequiredGuarantors(amount));
            }
        } else {
            setAmountError(null);
            setRequiredGuarantors(0);
        }
    }, [loanForm.amount_requested, getRequiredGuarantors, validateAmount]);

    // Submit loan request
    const handleSubmitLoan = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate amount
        const amount = parseFloat(loanForm.amount_requested);
        const validation = validateAmount(amount);
        if (!validation.valid) {
            setError(validation.message || 'Invalid amount');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const request = await createRequest({
                amount_requested: amount,
                tenure_months: parseInt(loanForm.tenure_months),
                purpose: loanForm.purpose || undefined,
            });

            // Create guarantor placeholders based on settings
            const numGuarantors = settings.guarantor_enabled ? getRequiredGuarantors(amount) : 0;
            for (let i = 0; i < numGuarantors; i++) {
                await addGuarantor({ loan_request_id: request.id });
            }

            if (numGuarantors > 0) {
                setSuccess(`Loan request submitted! Add ${numGuarantors} guarantor(s) to complete your application.`);
                setShowGuarantorForm(request.id);
            } else {
                setSuccess('Loan request submitted! Your application is being reviewed.');
            }

            setShowForm(false);
            setLoanForm({ amount_requested: '', tenure_months: '', purpose: '' });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Submit guarantor details
    const handleSubmitGuarantor = async (e: React.FormEvent, loanRequestId: string) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            await addGuarantor({
                loan_request_id: loanRequestId,
                ...guarantorForm,
            });
            setSuccess('Guarantor added successfully!');
            setShowGuarantorForm(null);
            setGuarantorForm({ full_name: '', email: '', phone: '', relationship: '' });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Copy guarantor link
    const copyLink = (token: string) => {
        const link = getGuarantorLink(token);
        navigator.clipboard.writeText(link);
        setCopiedLink(token);
        setTimeout(() => setCopiedLink(null), 2000);
    };

    // Delete loan request
    const handleDeleteRequest = async (requestId: string) => {
        if (!confirm('Are you sure you want to delete this loan request? This will also delete all associated guarantor submissions.')) {
            return;
        }
        setDeletingRequest(requestId);
        try {
            await deleteLoanRequest(requestId);
            setSuccess('Loan request deleted successfully!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setDeletingRequest(null);
        }
    };

    // Delete guarantor
    const handleDeleteGuarantor = async (guarantorId: string) => {
        if (!confirm('Are you sure you want to delete this guarantor link?')) {
            return;
        }
        setDeletingGuarantor(guarantorId);
        try {
            await deleteGuarantor(guarantorId);
            setSuccess('Guarantor link deleted successfully!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setDeletingGuarantor(null);
        }
    };

    // Open edit modal for pending/rejected requests
    const handleEditRequest = (request: any) => {
        if (request.status !== 'pending' && request.status !== 'rejected') {
            return;
        }
        setEditingRequest(request);
        setLoanForm({
            amount_requested: String(request.amount_requested),
            tenure_months: String(request.tenure_months),
            purpose: request.purpose || '',
        });
    };

    // Submit update
    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRequest) return;

        const amount = parseFloat(loanForm.amount_requested);
        const validation = validateAmount(amount);
        if (!validation.valid) {
            setError(validation.message || 'Invalid amount');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await updateRequest(editingRequest.id, {
                amount_requested: amount,
                tenure_months: parseInt(loanForm.tenure_months),
                purpose: loanForm.purpose || undefined,
            });
            setSuccess('Loan request updated and resubmitted for review!');
            setEditingRequest(null);
            setLoanForm({ amount_requested: '', tenure_months: '', purpose: '' });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Table columns
    const columns: Column[] = [
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
            key: 'purpose',
            label: 'Purpose',
            render: (value) => value || '-'
        },
        {
            key: 'guarantor_submissions',
            label: 'Guarantors',
            render: (value: any[]) => {
                const submitted = value?.filter(g => g.status === 'submitted').length || 0;
                const total = value?.length || 0;
                return `${submitted}/${total} submitted`;
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
        {
            key: 'id',
            label: 'Actions',
            render: (value, row) => (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Edit button for pending/rejected */}
                    {(row.status === 'pending' || row.status === 'rejected') && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEditRequest(row);
                            }}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--accent-primary)',
                                background: 'transparent',
                                color: 'var(--accent-primary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                            }}
                        >
                            ✏️ Edit
                        </button>
                    )}
                    {/* Delete button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRequest(value);
                        }}
                        disabled={deletingRequest === value || row.status === 'approved' || row.status === 'disbursed'}
                        title={row.status === 'approved' || row.status === 'disbursed' ? 'Cannot delete approved/disbursed requests' : 'Delete request'}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'var(--danger-bg)',
                            color: 'var(--danger)',
                            cursor: row.status === 'approved' || row.status === 'disbursed' ? 'not-allowed' : 'pointer',
                            opacity: row.status === 'approved' || row.status === 'disbursed' ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                        }}
                    >
                        {deletingRequest === value ? (
                            <MStreetLoader size={14} color="var(--danger)" />
                        ) : (
                            <Trash2 size={14} />
                        )}
                        Delete
                    </button>
                </div>
            )
        },
    ];

    // Show loading state matching internal dashboard
    if (loading || settingsLoading) {
        return (
            <div className={styles.loading}>
                <MStreetLoader size={120} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Loading loan requests...
                </p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.pageTitle}>Request a Loan</h1>
                    <p className={styles.pageSubtitle}>Apply for a new loan and manage your requests</p>
                </div>
                <div className={styles.headerRight}>
                    <button onClick={() => setShowForm(true)} className={styles.createBtn}>
                        <Plus size={20} />
                        <span>New Request</span>
                    </button>
                </div>
            </div>

            {/* Success/Error Messages */}
            {success && (
                <div style={{
                    background: 'var(--success-bg)',
                    color: 'var(--success)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    <CheckCircle size={18} />
                    {success}
                </div>
            )}

            {error && (
                <div style={{
                    background: 'var(--danger-bg)',
                    color: 'var(--danger)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                }}>
                    {error}
                </div>
            )}

            {/* Loan Request Form Modal */}
            {showForm && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }}>
                    <div style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: '16px',
                        padding: '32px',
                        width: '100%',
                        maxWidth: '500px',
                        border: '1px solid var(--border-primary)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Request a Loan</h2>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitLoan}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                    Amount Requested *
                                </label>
                                <input
                                    type="number"
                                    value={loanForm.amount_requested}
                                    onChange={(e) => setLoanForm(f => ({ ...f, amount_requested: e.target.value }))}
                                    required
                                    min={settings.loan_limits.min}
                                    max={settings.loan_limits.max}
                                    step="0.01"
                                    placeholder={`${formatCurrency(settings.loan_limits.min)} - ${formatCurrency(settings.loan_limits.max)}`}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        background: 'var(--bg-input)',
                                        border: amountError ? '1px solid var(--danger)' : '1px solid var(--border-secondary)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Min: {formatCurrency(settings.loan_limits.min)} | Max: {formatCurrency(settings.loan_limits.max)}
                                </p>
                                {amountError && (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--danger)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <AlertCircle size={14} /> {amountError}
                                    </p>
                                )}
                            </div>

                            {/* Guarantor Requirements Info */}
                            {settings.guarantor_enabled && requiredGuarantors > 0 && (
                                <div style={{
                                    background: 'var(--accent-bg)',
                                    border: '1px solid var(--accent-primary)',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}>
                                    <Users size={18} style={{ color: 'var(--accent-primary)' }} />
                                    <span style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>
                                        This amount requires <strong>{requiredGuarantors} guarantor(s)</strong>
                                    </span>
                                </div>
                            )}

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                    Loan Term (months) *
                                </label>
                                <select
                                    value={loanForm.tenure_months}
                                    onChange={(e) => setLoanForm(f => ({ ...f, tenure_months: e.target.value }))}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        background: 'var(--bg-input)',
                                        border: '1px solid var(--border-secondary)',
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    <option value="">Select term...</option>
                                    <option value="3">3 months</option>
                                    <option value="6">6 months</option>
                                    <option value="12">12 months</option>
                                    <option value="18">18 months</option>
                                    <option value="24">24 months</option>
                                    <option value="36">36 months</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                    Purpose
                                </label>
                                <textarea
                                    value={loanForm.purpose}
                                    onChange={(e) => setLoanForm(f => ({ ...f, purpose: e.target.value }))}
                                    placeholder="What will you use the loan for?"
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        background: 'var(--bg-input)',
                                        border: '1px solid var(--border-secondary)',
                                        color: 'var(--text-primary)',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-secondary)',
                                        background: 'transparent',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                        color: 'white',
                                        fontWeight: 600,
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        opacity: submitting ? 0.6 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    {submitting && <MStreetLoader size={16} color="#ffffff" />}
                                    Submit Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Request Modal */}
            {editingRequest && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }}>
                    <div style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: '16px',
                        padding: '32px',
                        width: '100%',
                        maxWidth: '500px',
                        border: '1px solid var(--border-primary)',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>
                                {editingRequest.status === 'rejected' ? 'Resubmit Loan Request' : 'Edit Loan Request'}
                            </h2>
                            <button onClick={() => { setEditingRequest(null); setLoanForm({ amount_requested: '', tenure_months: '', purpose: '' }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        {/* Rejection Reason Display */}
                        {editingRequest.status === 'rejected' && editingRequest.admin_notes && (
                            <div style={{
                                background: 'var(--danger-bg)',
                                border: '1px solid var(--danger)',
                                borderRadius: '8px',
                                padding: '12px',
                                marginBottom: '20px',
                            }}>
                                <p style={{ color: 'var(--danger)', margin: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span><strong>Rejection Reason:</strong> {editingRequest.admin_notes}</span>
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleUpdateSubmit}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                    Amount Requested *
                                </label>
                                <input
                                    type="number"
                                    value={loanForm.amount_requested}
                                    onChange={(e) => setLoanForm(f => ({ ...f, amount_requested: e.target.value }))}
                                    required
                                    min={settings.loan_limits.min}
                                    max={settings.loan_limits.max}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        background: 'var(--bg-input)',
                                        border: '1px solid var(--border-secondary)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                    Loan Term (months) *
                                </label>
                                <select
                                    value={loanForm.tenure_months}
                                    onChange={(e) => setLoanForm(f => ({ ...f, tenure_months: e.target.value }))}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        background: 'var(--bg-input)',
                                        border: '1px solid var(--border-secondary)',
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    <option value="">Select term...</option>
                                    {settings.tenure_options.map(opt => (
                                        <option key={opt} value={opt}>{opt} months</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                    Purpose
                                </label>
                                <textarea
                                    value={loanForm.purpose}
                                    onChange={(e) => setLoanForm(f => ({ ...f, purpose: e.target.value }))}
                                    placeholder="What will you use the loan for?"
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        background: 'var(--bg-input)',
                                        border: '1px solid var(--border-secondary)',
                                        color: 'var(--text-primary)',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => { setEditingRequest(null); setLoanForm({ amount_requested: '', tenure_months: '', purpose: '' }); }}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-secondary)',
                                        background: 'transparent',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: editingRequest.status === 'rejected'
                                            ? 'linear-gradient(135deg, var(--success), #22c55e)'
                                            : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                        color: 'white',
                                        fontWeight: 600,
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        opacity: submitting ? 0.6 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    {submitting && <MStreetLoader size={16} color="#ffffff" />}
                                    {editingRequest.status === 'rejected' ? 'Resubmit Request' : 'Update Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Requests Table */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>My Loan Requests</h2>
                <DataTable
                    columns={columns}
                    data={requests}
                    loading={loading}
                    emptyMessage="No loan requests yet. Click 'New Request' to apply for a loan."
                    paginated
                    defaultPageSize={10}
                />
            </div>

            {/* Guarantor Links Section */}
            {requests.some(r => r.guarantor_submissions?.length) && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Guarantor Links</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Share these links with your guarantors to complete their verification.
                    </p>

                    <div style={{ display: 'grid', gap: '12px' }}>
                        {requests.map(req =>
                            req.guarantor_submissions?.map((g, i) => (
                                <div key={g.id} style={{
                                    background: g.status === 'rejected' ? 'var(--danger-bg)' : 'var(--bg-secondary)',
                                    border: g.status === 'rejected'
                                        ? '1px solid var(--danger)'
                                        : '1px solid var(--border-primary)',
                                    borderRadius: '12px',
                                    padding: '16px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <div>
                                            <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>
                                                Guarantor {i + 1} {g.full_name ? `- ${g.full_name}` : ''}
                                            </p>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                                                For {formatCurrency(req.amount_requested)} loan
                                            </p>
                                        </div>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            textTransform: 'capitalize',
                                            background: g.status === 'verified' ? 'var(--success-bg)'
                                                : g.status === 'submitted' ? 'var(--accent-bg)'
                                                    : g.status === 'rejected' ? 'var(--danger-bg)'
                                                        : 'var(--warning-bg)',
                                            color: g.status === 'verified' ? 'var(--success)'
                                                : g.status === 'submitted' ? 'var(--accent-primary)'
                                                    : g.status === 'rejected' ? 'var(--danger)'
                                                        : 'var(--warning)',
                                        }}>
                                            {g.status === 'verified' ? '✓ Verified'
                                                : g.status === 'submitted' ? '📄 Submitted'
                                                    : g.status === 'rejected' ? '✗ Rejected'
                                                        : '⏳ Pending'}
                                        </span>
                                    </div>

                                    {/* Rejection Reason for Guarantor */}
                                    {g.status === 'rejected' && g.admin_notes && (
                                        <div style={{
                                            background: 'rgba(220, 38, 38, 0.1)',
                                            borderRadius: '6px',
                                            padding: '10px',
                                            marginBottom: '12px',
                                        }}>
                                            <p style={{ color: 'var(--danger)', margin: 0, fontSize: '0.85rem' }}>
                                                <strong>❌ Rejection Reason:</strong> {g.admin_notes}
                                            </p>
                                            <p style={{ color: 'var(--text-muted)', margin: '8px 0 0', fontSize: '0.8rem' }}>
                                                Delete this link and add a new guarantor, or ask them to resubmit.
                                            </p>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {/* Copy Link - not for rejected */}
                                        {g.status !== 'rejected' && (
                                            <button
                                                onClick={() => copyLink(g.access_token)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '8px 16px',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--accent-primary)',
                                                    background: copiedLink === g.access_token ? 'var(--success-bg)' : 'transparent',
                                                    color: copiedLink === g.access_token ? 'var(--success)' : 'var(--accent-primary)',
                                                    cursor: 'pointer',
                                                    fontWeight: 500,
                                                    fontSize: '0.85rem',
                                                }}
                                            >
                                                {copiedLink === g.access_token ? (
                                                    <><CheckCircle size={16} /> Copied!</>
                                                ) : (
                                                    <><Copy size={16} /> Copy Link</>
                                                )}
                                            </button>
                                        )}

                                        {/* Delete - allowed for pending AND rejected */}
                                        {(g.status === 'pending' || g.status === 'rejected') && (
                                            <button
                                                onClick={() => handleDeleteGuarantor(g.id)}
                                                disabled={deletingGuarantor === g.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    background: 'var(--danger-bg)',
                                                    color: 'var(--danger)',
                                                    cursor: 'pointer',
                                                    fontWeight: 500,
                                                    fontSize: '0.85rem',
                                                }}
                                            >
                                                {deletingGuarantor === g.id ? (
                                                    <MStreetLoader size={14} color="var(--danger)" />
                                                ) : (
                                                    <Trash2 size={14} />
                                                )}
                                                Delete
                                            </button>
                                        )}

                                        {/* Add New Guarantor - only show if rejected and this is the rejected one */}
                                        {g.status === 'rejected' && (
                                            <button
                                                onClick={async () => {
                                                    await handleDeleteGuarantor(g.id);
                                                    await addGuarantor({ loan_request_id: req.id });
                                                    setSuccess('New guarantor link created! Share it with your guarantor.');
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    background: 'var(--success)',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    fontWeight: 500,
                                                    fontSize: '0.85rem',
                                                }}
                                            >
                                                🔄 Replace with New
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
