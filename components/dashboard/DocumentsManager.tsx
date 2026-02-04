'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import DataTable, { Column, RowAction } from '@/components/dashboard/DataTable';
import DocumentViewerModal from '@/components/dashboard/DocumentViewerModal';
import { FileText, Eye, Trash2, Filter } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import styles from './CreateCreditForm.module.css';

interface Document {
    id: string;
    file_url: string;
    file_name: string;
    created_at: string;
    type: 'offer_letter' | 'placement_letter' | 'investment_letter';
    user_name: string;
    user_email: string;
    loan_id?: string;
    credit_id?: string;
    investment_id?: string;
    investee_id?: string;
    debtor_id?: string;
    creditor_id?: string;
    is_signed?: boolean;
}

type FilterType = 'all' | 'offer_letter' | 'placement_letter' | 'investment_letter';

export default function DocumentsManager() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [showModal, setShowModal] = useState(false);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const supabase = createClient();

            // Fetch loan documents (offer letters)
            const { data: loanDocs, error: loanError } = await supabase
                .from('loan_documents')
                .select(`
                    id,
                    file_url,
                    file_name,
                    created_at,
                    loan_id,
                    debtor_id,
                    is_signed,
                    signed_file_url,
                    debtor:users!loan_documents_debtor_id_fkey(full_name, email)
                `)
                .order('created_at', { ascending: false });

            if (loanError) console.error('Error fetching loan docs:', loanError);

            // Fetch placement documents (placement letters)
            const { data: placementDocs, error: placementError } = await supabase
                .from('placement_documents')
                .select(`
                    id,
                    file_url,
                    file_name,
                    created_at,
                    credit_id,
                    creditor_id,
                    creditor:users!placement_documents_creditor_id_fkey(full_name, email)
                `)
                .order('created_at', { ascending: false });

            if (placementError) console.error('Error fetching placement docs:', placementError);

            // Fetch investment documents (company investments)
            const { data: investmentDocs, error: investmentError } = await supabase
                .from('investment_documents')
                .select(`
                    id,
                    file_url,
                    file_name,
                    created_at,
                    investment_id,
                    investment:investments!investment_documents_investment_id_fkey (
                        investee_id,
                        company_name,
                        investee:investee_companies!investments_investee_id_fkey (
                            name
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            if (investmentError) {
                console.error('Error fetching investment docs:', investmentError);
            }

            // Combine and format documents
            const formattedLoanDocs: Document[] = (loanDocs || []).map(doc => ({
                id: doc.id,
                // Use signed_file_url if document is signed, otherwise use original file_url
                file_url: doc.is_signed && doc.signed_file_url ? doc.signed_file_url : doc.file_url,
                file_name: doc.is_signed ? `(Signed) ${doc.file_name}` : doc.file_name,
                created_at: doc.created_at,
                type: 'offer_letter' as const,
                user_name: (doc.debtor as any)?.full_name || 'Unknown',
                user_email: (doc.debtor as any)?.email || '',
                loan_id: doc.loan_id,
                debtor_id: doc.debtor_id,
                is_signed: doc.is_signed
            }));

            const formattedPlacementDocs: Document[] = (placementDocs || []).map(doc => ({
                id: doc.id,
                file_url: doc.file_url,
                file_name: doc.file_name,
                created_at: doc.created_at,
                type: 'placement_letter' as const,
                user_name: (doc.creditor as any)?.full_name || 'Unknown',
                user_email: (doc.creditor as any)?.email || '',
                credit_id: doc.credit_id,
                creditor_id: doc.creditor_id
            }));

            const formattedInvestmentDocs: Document[] = (investmentDocs || []).map(doc => {
                const inv = (doc as any).investment;
                return {
                    id: doc.id,
                    file_url: doc.file_url,
                    file_name: doc.file_name,
                    created_at: doc.created_at,
                    type: 'investment_letter' as const,
                    user_name: inv?.investee?.name || inv?.company_name || 'Unknown Company',
                    user_email: 'Company Investment',
                    investment_id: doc.investment_id,
                    investee_id: inv?.investee_id
                };
            });

            setDocuments([...formattedLoanDocs, ...formattedPlacementDocs, ...formattedInvestmentDocs].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ));
        } catch (err) {
            console.error('Error fetching documents:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    // Filter documents
    const filteredDocs = useMemo(() => {
        if (filter === 'all') return documents;
        return documents.filter(doc => doc.type === filter);
    }, [documents, filter]);

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Table columns
    const columns: Column[] = [
        {
            key: 'user_name',
            label: 'User',
            render: (_, row) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500 }}>{row.user_name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.user_email}</span>
                </div>
            )
        },
        {
            key: 'type',
            label: 'Document Type',
            render: (value, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        background: value === 'offer_letter'
                            ? 'rgba(59, 130, 246, 0.1)'
                            : value === 'placement_letter'
                                ? 'rgba(16, 185, 129, 0.1)'
                                : 'rgba(139, 92, 246, 0.1)',
                        color: value === 'offer_letter'
                            ? '#3b82f6'
                            : value === 'placement_letter'
                                ? '#10b981'
                                : '#8b5cf6'
                    }}>
                        <FileText size={12} />
                        {value === 'offer_letter'
                            ? 'Offer Letter'
                            : value === 'placement_letter'
                                ? 'Placement Letter'
                                : 'Investment Letter'}
                    </span>
                    {row.is_signed && (
                        <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981'
                        }}>
                            ✓ Signed
                        </span>
                    )}
                </div>
            )
        },
        {
            key: 'file_name',
            label: 'File Name',
            render: (value) => (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {value}
                </span>
            )
        },
        {
            key: 'created_at',
            label: 'Uploaded',
            render: (value) => formatDate(value)
        }
    ];

    // Row actions
    const rowActions: RowAction[] = [
        {
            label: 'View',
            icon: <Eye size={16} />,
            onClick: (row) => {
                setSelectedDoc(row);
                setShowModal(true);
            }
        },
        {
            label: 'Delete',
            icon: <Trash2 size={16} />,
            variant: 'danger',
            onClick: async (row) => {
                if (!confirm(`Delete "${row.file_name}"?`)) return;

                const supabase = createClient();
                const table = row.type === 'offer_letter'
                    ? 'loan_documents'
                    : row.type === 'placement_letter'
                        ? 'placement_documents'
                        : 'investment_documents';

                const { error } = await supabase.from(table).delete().eq('id', row.id);
                if (error) {
                    alert('Failed to delete: ' + error.message);
                } else {
                    fetchDocuments();
                }
            }
        }
    ];

    return (
        <div className={styles.form}>
            <h3 className={styles.formTitle}>Document Management</h3>
            <p className={styles.formSubtitle}>View and manage all offer letters and placement letters</p>

            {/* Filter */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
                padding: '16px',
                background: 'var(--bg-tertiary)',
                borderRadius: '12px'
            }}>
                <Filter size={18} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Filter:</span>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as FilterType)}
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        minWidth: '180px'
                    }}
                >
                    <option value="all">All Documents</option>
                    <option value="offer_letter">Offer Letters (Debtors)</option>
                    <option value="placement_letter">Placement Letters (Creditors)</option>
                    <option value="investment_letter">Investment Letters (Companies)</option>
                </select>
                <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Documents Table */}
            <DataTable
                columns={columns}
                data={filteredDocs}
                loading={loading}
                emptyMessage="No documents found"
                searchable
                searchPlaceholder="Search by user name or file name..."
                searchKeys={['user_name', 'user_email', 'file_name']}
                paginated
                defaultPageSize={10}
                actions={rowActions}
                onRowClick={(row) => {
                    setSelectedDoc(row);
                    setShowModal(true);
                }}
            />

            {/* Document Viewer Modal */}
            <DocumentViewerModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setSelectedDoc(null);
                }}
                document={selectedDoc}
                onDelete={fetchDocuments}
                onUpdate={fetchDocuments}
            />
        </div>
    );
}
