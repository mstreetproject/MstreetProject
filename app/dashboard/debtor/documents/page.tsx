'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDebtorLoans } from '@/hooks/dashboard/useDebtorLoans';
import { useCurrency } from '@/hooks/useCurrency';
import { useLoanDocuments } from '@/hooks/dashboard/useLoanDocuments';
import { useRepaymentSchedule } from '@/hooks/dashboard/useRepaymentSchedule';
import { useActivityLog } from '@/hooks/useActivityLog';
import { createClient } from '@/lib/supabase/client';
import DataTable from '@/components/dashboard/DataTable';
import SignDocumentModal from '@/components/dashboard/SignDocumentModal';
import PdfViewerModal from '@/components/dashboard/PdfViewerModal';
import MStreetLoader from '@/components/ui/MStreetLoader';
import {
    FileText,
    Download,
    Eye,
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    PenTool,
    Upload
} from 'lucide-react';
import styles from './DocumentsPage.module.css';

// --- Sub-components ---

function LoanDocumentSection({ loan, formatCurrency }: { loan: any, formatCurrency: any }) {
    const { documents, loading: docsLoading, refetch: refetchDocs, error: docsError } = useLoanDocuments(loan.id);
    const { schedule, loading: scheduleLoading } = useRepaymentSchedule(loan.id);
    const { logActivity } = useActivityLog();

    const [isExpanded, setIsExpanded] = useState(false);
    const [showSignModal, setShowSignModal] = useState(false);
    const [viewingPdf, setViewingPdf] = useState<{ url: string, name: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get the primary offer letter (most recent)
    const offerLetter = documents.find(d => d.file_name.toLowerCase().includes('offer') || d.file_name.toLowerCase().includes('agreement')) || documents[0];
    const signedLetter = documents.find(d => d.is_signed === true);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            setError(null);
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // 1. Upload to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${loan.id}/signed_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('mstreetstorage')
                .upload(`loan-documents/${fileName}`, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('mstreetstorage')
                .getPublicUrl(`loan-documents/${fileName}`);

            // 3. Insert into loan_documents
            const { error: dbError } = await supabase.from('loan_documents').insert({
                loan_id: loan.id,
                debtor_id: user.id,
                file_url: publicUrl,
                file_name: file.name,
                is_signed: true,
                signed_at: new Date().toISOString()
            });

            if (dbError) throw dbError;

            await logActivity('UPLOAD_DOCUMENT', 'loan_document', loan.id, {
                file_name: file.name,
                loan_id: loan.id
            });

            await refetchDocs();
        } catch (err) {
            console.error('Upload error:', err);
            setError(err instanceof Error ? err.message : 'Failed to upload document');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={styles.loanCard}>
            <div
                className={styles.loanHeader}
                onClick={() => setIsExpanded(!isExpanded)}
                role="button"
                aria-expanded={isExpanded}
            >
                <div className={styles.loanInfoMain}>
                    <div className={styles.iconBox}>
                        <FileText size={24} />
                    </div>
                    <div>
                        <h3 className={styles.loanTitle}>Agreement - {formatCurrency(loan.principal)}</h3>
                        <p className={styles.loanDate}>Issued: {new Date(loan.start_date || loan.created_at).toLocaleDateString()} • REF: {loan.reference_no || '---'}</p>
                    </div>
                </div>

                <div className={styles.loanStatusRow}>
                    <div className={`${styles.statusBadge} ${signedLetter ? styles.signed : styles.pending}`}>
                        {signedLetter ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {signedLetter ? 'Signed' : 'Awaiting Signature'}
                    </div>
                    <div className={styles.expandIcon}>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className={styles.loanDetails}>
                    <div className={styles.detailsGrid}>
                        {/* Offer Letter Section */}
                        <div className={styles.detailsSection}>
                            <h4 className={styles.sectionHeading}>Offer Letter / Agreement</h4>
                            {docsLoading ? (
                                <MStreetLoader size={24} />
                            ) : offerLetter ? (
                                <div className={styles.docActions}>
                                    <div className={styles.docInfo}>
                                        <FileText size={20} className={styles.docIcon} />
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {offerLetter.file_name}
                                        </span>
                                    </div>
                                    <div className={styles.buttonGroup}>
                                        <button
                                            onClick={() => setViewingPdf({ url: offerLetter.signed_file_url || offerLetter.file_url, name: offerLetter.file_name })}
                                            className={styles.viewBtn}
                                        >
                                            <Eye size={16} /> View Document
                                        </button>
                                        {!signedLetter && (
                                            <>
                                                <button className={styles.signBtn} onClick={(e) => { e.stopPropagation(); setShowSignModal(true); }}>
                                                    <PenTool size={16} /> Sign Online
                                                </button>
                                                <div className={styles.uploadWrapper}>
                                                    <button className={styles.uploadBtn} disabled={uploading}>
                                                        {uploading ? <MStreetLoader size={16} /> : <Upload size={16} />}
                                                        Upload Signed Copy
                                                    </button>
                                                    <input
                                                        type="file"
                                                        className={styles.hiddenInput}
                                                        onChange={handleFileUpload}
                                                        accept=".pdf,.png,.jpg,.jpeg"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className={styles.emptyText}>No offer letter found for this agreement.</p>
                            )}
                            {error && <p className={styles.errorText}>{error}</p>}
                        </div>

                        {/* Schedule Section */}
                        <div className={styles.detailsSection}>
                            <h4 className={styles.sectionHeading}>Repayment Schedule</h4>
                            {scheduleLoading ? (
                                <MStreetLoader size={24} />
                            ) : (
                                <div className={styles.tableWrapper}>
                                    <DataTable
                                        columns={[
                                            {
                                                key: 'installment_no',
                                                label: '#',
                                                width: '50px',
                                                align: 'center'
                                            },
                                            {
                                                key: 'due_date',
                                                label: 'Due Date',
                                                width: '100px',
                                                render: (val) => new Date(val).toLocaleDateString()
                                            },
                                            {
                                                key: 'principal_amount',
                                                label: 'Principal',
                                                width: '110px',
                                                align: 'right',
                                                render: (val) => <span style={{ fontWeight: 500 }}>{formatCurrency(val)}</span>
                                            },
                                            {
                                                key: 'interest_amount',
                                                label: 'Interest',
                                                width: '100px',
                                                align: 'right',
                                                render: (val) => <span style={{ color: 'var(--accent-primary)' }}>{formatCurrency(val)}</span>
                                            },
                                            {
                                                key: 'total_amount',
                                                label: 'Total',
                                                width: '110px',
                                                align: 'right',
                                                render: (val, row) => (
                                                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                                                        {formatCurrency((row.principal_amount || 0) + (row.interest_amount || 0))}
                                                    </span>
                                                )
                                            },
                                            {
                                                key: 'status',
                                                label: 'Status',
                                                width: '90px',
                                                align: 'center',
                                                render: (val) => (
                                                    <span className={`${styles.scheduleStatus} ${styles[val]}`}>
                                                        {val}
                                                    </span>
                                                )
                                            }
                                        ]}
                                        data={schedule}
                                        paginated={false}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {offerLetter && (
                <SignDocumentModal
                    isOpen={showSignModal}
                    onClose={() => setShowSignModal(false)}
                    onSuccess={() => {
                        refetchDocs();
                        setIsExpanded(true);
                    }}
                    documentId={offerLetter.id}
                    documentName={offerLetter.file_name}
                    loanId={loan.id}
                    loanPrincipal={loan.principal}
                />
            )}

            <PdfViewerModal
                isOpen={!!viewingPdf}
                pdfUrl={viewingPdf?.url || ''}
                title={viewingPdf?.name || 'Document'}
                onClose={() => setViewingPdf(null)}
            />
        </div>
    );
}

// --- Main Page ---

export default function DocumentsPage() {
    const { loans, loading } = useDebtorLoans();
    const { formatCurrency } = useCurrency();

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
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>My Agreements</h1>
                <p className={styles.pageSubtitle}>Review your loan agreements and repayment schedules</p>
            </div>

            <div className={styles.loanList}>
                {loans.length === 0 ? (
                    <div className={styles.emptyState}>
                        <FileText size={48} className={styles.emptyIcon} />
                        <p>You don't have any active agreements yet.</p>
                    </div>
                ) : (
                    loans.map(loan => (
                        <LoanDocumentSection
                            key={loan.id}
                            loan={loan}
                            formatCurrency={formatCurrency}
                        />
                    ))
                )}
            </div>

            <div className={styles.infoBox}>
                <AlertCircle size={24} className={styles.infoIcon} />
                <div>
                    <h4 className={styles.infoTitle}>About your Documents</h4>
                    <p className={styles.infoText}>
                        You can sign your offer letters electronically or upload a scanned copy.
                        The repayment schedule shows your planned installments and their current status.
                    </p>
                </div>
            </div>
        </div>
    );
}
