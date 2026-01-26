'use client';

import React from 'react';
import { useDebtorLoans } from '@/hooks/dashboard/useDebtorLoans';
import { useCurrency } from '@/hooks/useCurrency';
import { FileText, Download, Eye, AlertCircle } from 'lucide-react';
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

export default function DocumentsPage() {
    const { loans, loading } = useDebtorLoans();
    const { formatCurrency } = useCurrency();

    // Show loading state matching internal dashboard
    if (loading) {
        return (
            <div className={styles.loading}>
                <MStreetLoader size={120} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Loading documents...
                </p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.pageTitle}>My Documents</h1>
                    <p className={styles.pageSubtitle}>View and download your loan documents</p>
                </div>
            </div>

            {/* Documents Section */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Loan Agreements</h2>

                {loading ? (
                    <div style={{
                        padding: '40px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                    }}>
                        Loading documents...
                    </div>
                ) : loans.length === 0 ? (
                    <div style={{
                        padding: '60px',
                        textAlign: 'center',
                        background: 'var(--bg-secondary)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-primary)',
                    }}>
                        <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                        <p style={{ color: 'var(--text-muted)' }}>No documents available yet</p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gap: '16px',
                    }}>
                        {loans.map((loan) => (
                            <div
                                key={loan.id}
                                style={{
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-primary)',
                                    padding: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                }}
                            >
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '10px',
                                    background: 'var(--accent-bg)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--accent-primary)',
                                }}>
                                    <FileText size={24} />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <h3 style={{
                                        color: 'var(--text-primary)',
                                        marginBottom: '4px',
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                    }}>
                                        Loan Agreement - {formatCurrency(loan.principal)}
                                    </h3>
                                    <p style={{
                                        color: 'var(--text-muted)',
                                        fontSize: '0.85rem',
                                        margin: 0,
                                    }}>
                                        Issued: {formatDate(loan.start_date)} • Due: {formatDate(loan.end_date)}
                                    </p>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 12px',
                                    borderRadius: '20px',
                                    background: loan.status === 'performing' ? 'var(--accent-bg)' :
                                        loan.status === 'preliquidated' ? 'var(--success-bg)' : 'var(--warning-bg)',
                                    color: loan.status === 'performing' ? 'var(--accent-primary)' :
                                        loan.status === 'preliquidated' ? 'var(--success)' : 'var(--warning)',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    textTransform: 'capitalize',
                                }}>
                                    {loan.status}
                                </div>

                                {/* Note: Document download functionality would require actual documents stored */}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div style={{
                marginTop: '32px',
                padding: '20px',
                background: 'var(--accent-bg)',
                borderRadius: '12px',
                border: '1px solid rgba(2, 179, 255, 0.2)',
                display: 'flex',
                gap: '12px',
            }}>
                <AlertCircle size={20} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '4px' }}>
                        Need a document?
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        If you need copies of your loan agreements or other documents, please contact our support team.
                    </p>
                </div>
            </div>
        </div>
    );
}
