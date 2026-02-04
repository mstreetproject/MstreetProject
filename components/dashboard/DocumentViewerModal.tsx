'use client';

import React, { useState } from 'react';
import { X, ExternalLink, Trash2, Upload, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import MStreetLoader from '@/components/ui/MStreetLoader';
import styles from './SignDocumentModal.module.css';

interface DocumentViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: {
        id: string;
        file_url: string;
        file_name: string;
        type: 'offer_letter' | 'placement_letter' | 'investment_letter';
        user_name?: string;
        loan_id?: string;
        credit_id?: string;
        investment_id?: string;
        creditor_id?: string;
        debtor_id?: string;
        investee_id?: string;
    } | null;
    onDelete?: () => void;
    onUpdate?: () => void;
}

export default function DocumentViewerModal({
    isOpen,
    onClose,
    document,
    onDelete,
    onUpdate
}: DocumentViewerModalProps) {
    const [deleting, setDeleting] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !document) return null;

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete "${document.file_name}"? This action cannot be undone.`)) {
            return;
        }

        setDeleting(true);
        setError(null);

        try {
            const supabase = createClient();
            const table = document.type === 'offer_letter'
                ? 'loan_documents'
                : document.type === 'placement_letter'
                    ? 'placement_documents'
                    : 'investment_documents';

            const { error: deleteError } = await supabase
                .from(table)
                .delete()
                .eq('id', document.id);

            if (deleteError) throw deleteError;

            onDelete?.();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete document');
        } finally {
            setDeleting(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUpdating(true);
        setError(null);

        try {
            const supabase = createClient();
            const table = document.type === 'offer_letter'
                ? 'loan_documents'
                : document.type === 'placement_letter'
                    ? 'placement_documents'
                    : 'investment_documents';

            const folder = document.type === 'offer_letter'
                ? 'loan-documents'
                : document.type === 'placement_letter'
                    ? 'placement-documents'
                    : 'investment-documents';

            const userId = document.type === 'offer_letter'
                ? document.debtor_id
                : document.type === 'placement_letter'
                    ? document.creditor_id
                    : document.investee_id;

            const entityId = document.type === 'offer_letter'
                ? document.loan_id
                : document.type === 'placement_letter'
                    ? document.credit_id
                    : document.investment_id;

            // Upload new file
            const fileName = `${userId}/${entityId}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('mstreetstorage')
                .upload(`${folder}/${fileName}`, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('mstreetstorage')
                .getPublicUrl(`${folder}/${fileName}`);

            // Update database record
            const { error: updateError } = await supabase
                .from(table)
                .update({
                    file_url: publicUrl,
                    file_name: file.name
                })
                .eq('id', document.id);

            if (updateError) throw updateError;

            onUpdate?.();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update document');
        } finally {
            setUpdating(false);
        }
    };

    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(document.file_name);
    const isPdf = /\.pdf$/i.test(document.file_name);

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} style={{ maxWidth: '900px', height: '90vh' }}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className={styles.iconCircle} style={{
                            background: document.type === 'offer_letter'
                                ? 'rgba(59, 130, 246, 0.1)'
                                : document.type === 'placement_letter'
                                    ? 'rgba(16, 185, 129, 0.1)'
                                    : 'rgba(139, 92, 246, 0.1)',
                            color: document.type === 'offer_letter'
                                ? '#3b82f6'
                                : document.type === 'placement_letter'
                                    ? '#10b981'
                                    : '#8b5cf6'
                        }}>
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className={styles.title}>{document.file_name}</h3>
                            <p className={styles.subtitle}>
                                {document.type === 'offer_letter' ? 'Offer Letter' : document.type === 'placement_letter' ? 'Placement Letter' : 'Investment Letter'}
                                {document.user_name && ` • ${document.user_name}`}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a
                            href={document.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.cancelBtn}
                            style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                        >
                            <ExternalLink size={14} /> Open
                        </a>
                        <button onClick={onClose} className={styles.closeBtn}>
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className={styles.content} style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
                    {isImage ? (
                        <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--bg-tertiary)',
                            padding: '20px'
                        }}>
                            <img
                                src={document.file_url}
                                alt={document.file_name}
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
                            />
                        </div>
                    ) : isPdf ? (
                        <iframe
                            src={`${document.file_url}#toolbar=0`}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            title={document.file_name}
                        />
                    ) : (
                        <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--bg-tertiary)',
                            gap: '16px'
                        }}>
                            <FileText size={64} style={{ color: 'var(--text-muted)' }} />
                            <p style={{ color: 'var(--text-secondary)' }}>Preview not available for this file type</p>
                            <a
                                href={document.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.submitBtn}
                                style={{ textDecoration: 'none' }}
                            >
                                <ExternalLink size={16} /> Open File
                            </a>
                        </div>
                    )}
                </div>

                {error && (
                    <div style={{ padding: '0 24px' }}>
                        <div className={styles.errorMessage}>{error}</div>
                    </div>
                )}

                <div className={styles.footer}>
                    <input
                        id="doc-replace-upload"
                        type="file"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                    <button
                        onClick={() => window.document.getElementById('doc-replace-upload')?.click()}
                        className={styles.cancelBtn}
                        disabled={updating}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        {updating ? <MStreetLoader size={14} /> : <Upload size={14} />}
                        {updating ? 'Uploading...' : 'Replace'}
                    </button>
                    <button
                        onClick={handleDelete}
                        className={styles.cancelBtn}
                        disabled={deleting}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#ef4444',
                            borderColor: 'rgba(239, 68, 68, 0.3)'
                        }}
                    >
                        {deleting ? <MStreetLoader size={14} color="#ef4444" /> : <Trash2 size={14} />}
                        {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                    <button onClick={onClose} className={styles.submitBtn}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
