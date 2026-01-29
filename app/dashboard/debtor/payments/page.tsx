'use client';

import React, { useState, useRef } from 'react';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import { useDebtorLoans } from '@/hooks/dashboard/useDebtorLoans';
import { usePaymentUploads } from '@/hooks/dashboard/usePaymentUploads';
import { useCurrency } from '@/hooks/useCurrency';
import { createClient } from '@/lib/supabase/client';
import {
    Upload,
    CheckCircle,
    X
} from 'lucide-react';
import styles from '../../internal/creditors/page.module.css';
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

export default function PaymentsPage() {
    const { loans } = useDebtorLoans();
    const { uploads, loading, uploadPayment, refetch } = usePaymentUploads();
    const { formatCurrency } = useCurrency();

    const [showUploadForm, setShowUploadForm] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        loan_id: '',
        amount_paid: '',
        payment_date: new Date().toISOString().split('T')[0],
        file: null as File | null,
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(d => ({ ...d, file }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploadError(null);
        setUploading(true);

        try {
            if (!formData.loan_id || !formData.file) {
                throw new Error('Please select a loan and upload a file');
            }

            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Upload file to Supabase Storage
            const fileExt = formData.file.name.split('.').pop();
            const fileName = `${user.id}/${formData.loan_id}/${Date.now()}.${fileExt}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('mstreetstorage')
                .upload(`payment-proofs/${fileName}`, formData.file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('mstreetstorage')
                .getPublicUrl(`payment-proofs/${fileName}`);

            // Create payment record
            await uploadPayment({
                loan_id: formData.loan_id,
                file_url: publicUrl,
                file_name: formData.file.name,
                amount_paid: formData.amount_paid ? parseFloat(formData.amount_paid) : undefined,
                payment_date: formData.payment_date || undefined,
            });

            setUploadSuccess(true);
            setFormData({
                loan_id: '',
                amount_paid: '',
                payment_date: new Date().toISOString().split('T')[0],
                file: null,
            });
            if (fileInputRef.current) fileInputRef.current.value = '';

            setTimeout(() => {
                setShowUploadForm(false);
                setUploadSuccess(false);
            }, 2000);

        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    // Table columns
    const columns: Column[] = [
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
            key: 'admin_notes',
            label: 'Notes',
            render: (value) => value || '-'
        },
        {
            key: 'created_at',
            label: 'Uploaded',
            render: (value) => formatDate(value)
        },
    ];

    // Show loading state matching internal dashboard
    if (loading) {
        return (
            <div className={styles.loading}>
                <MStreetLoader size={120} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Loading payments...
                </p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.pageTitle}>Payment Uploads</h1>
                    <p className={styles.pageSubtitle}>Upload proof of payment for your loans</p>
                </div>
                <div className={styles.headerRight}>
                    <button
                        onClick={() => setShowUploadForm(true)}
                        className={styles.createBtn}
                    >
                        <Upload size={20} />
                        <span>Upload Payment</span>
                    </button>
                </div>
            </div>

            {/* Upload Form Modal */}
            {showUploadForm && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Upload Payment Proof</h2>
                            <button onClick={() => setShowUploadForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        {uploadSuccess ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <CheckCircle size={48} style={{ color: 'var(--success)' }} />
                                <p style={{ color: 'var(--text-primary)', marginTop: '16px' }}>Upload successful!</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                {uploadError && (
                                    <div style={{
                                        background: 'var(--danger-bg)',
                                        color: 'var(--danger)',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        marginBottom: '16px'
                                    }}>
                                        {uploadError}
                                    </div>
                                )}

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                        Select Loan *
                                    </label>
                                    <select
                                        value={formData.loan_id}
                                        onChange={(e) => setFormData(d => ({ ...d, loan_id: e.target.value }))}
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
                                        <option value="">Choose a loan...</option>
                                        {loans.filter(l => l.status === 'performing' || l.status === 'non_performing').map(loan => (
                                            <option key={loan.id} value={loan.id}>
                                                {formatCurrency(loan.principal)} - Due: {formatDate(loan.end_date)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                        Amount Paid
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.amount_paid}
                                        onChange={(e) => setFormData(d => ({ ...d, amount_paid: e.target.value }))}
                                        placeholder="0.00"
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
                                        Payment Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.payment_date}
                                        onChange={(e) => setFormData(d => ({ ...d, payment_date: e.target.value }))}
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

                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                        Upload File *
                                    </label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        onChange={handleFileChange}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            background: 'var(--bg-input)',
                                            border: '1px solid var(--border-secondary)',
                                            color: 'var(--text-primary)',
                                        }}
                                    />
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                        Accepted: PDF, PNG, JPG (max 5MB)
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowUploadForm(false)}
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
                                        disabled={uploading}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                            color: 'white',
                                            fontWeight: 600,
                                            cursor: uploading ? 'not-allowed' : 'pointer',
                                            opacity: uploading ? 0.6 : 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                        }}
                                    >
                                        {uploading && <MStreetLoader size={16} color="#ffffff" />}
                                        {uploading ? 'Uploading...' : 'Upload'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Payments Table */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>All Uploads</h2>
                <DataTable
                    columns={columns}
                    data={uploads}
                    loading={loading}
                    emptyMessage="No payment uploads yet. Click 'Upload Payment' to submit proof of payment."
                    searchable
                    searchKeys={['file_name', 'status']}
                    paginated
                    defaultPageSize={10}
                />
            </div>
        </div>
    );
}
