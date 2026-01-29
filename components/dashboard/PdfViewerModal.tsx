'use client';

import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import styles from './SignDocumentModal.module.css';

interface PdfViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string;
    title: string;
}

export default function PdfViewerModal({
    isOpen,
    onClose,
    pdfUrl,
    title
}: PdfViewerModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} style={{ maxWidth: '900px', height: '90vh' }}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className={styles.iconCircle} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className={styles.title}>{title}</h3>
                            <p className={styles.subtitle}>Viewing Document Inline</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.cancelBtn}
                            style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <ExternalLink size={14} /> Open Original
                        </a>
                        <button onClick={onClose} className={styles.closeBtn}>
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className={styles.content} style={{ padding: 0, overflow: 'hidden' }}>
                    <iframe
                        src={`${pdfUrl}#toolbar=0`}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title={title}
                    />
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.submitBtn}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

const FileText = ({ size, ...props }: any) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
);
