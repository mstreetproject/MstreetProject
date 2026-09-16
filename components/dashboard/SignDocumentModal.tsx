'use client';

import React, { useState, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import SignatureCanvas from 'react-signature-canvas';
import { X, CheckCircle, FileText, PenTool, ShieldCheck, AlertCircle, Eraser } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import { createClient } from '@/lib/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';
import styles from './SignDocumentModal.module.css';

interface SignDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    documentId: string;
    documentName: string;
    loanId: string;
    loanPrincipal: number;
}

export default function SignDocumentModal({
    isOpen,
    onClose,
    onSuccess,
    documentId,
    documentName,
    loanId,
    loanPrincipal
}: SignDocumentModalProps) {
    const { logActivity } = useActivityLog();
    const sigPad = useRef<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fullName, setFullName] = useState('');
    const [agreed, setAgreed] = useState(false);

    if (!isOpen) return null;

    const clearSignature = () => {
        if (sigPad.current) {
            sigPad.current.clear();
        }
    };

    const handleSign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim() || !agreed) {
            setError('Please provide your full name and agree to the terms.');
            return;
        }

        if (sigPad.current?.isEmpty()) {
            setError('Please draw your signature in the pad provided.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // 1. Fetch the existing document record
            const { data: docRecord, error: fetchError } = await supabase
                .from('loan_documents')
                .select('*')
                .eq('id', documentId)
                .single();

            if (fetchError || !docRecord) throw new Error('Could not find document record');

            // 2. Resolve storage path and download
            let storagePath = '';
            const fileUrl = docRecord.file_url;

            if (fileUrl.includes('/mstreetstorage/')) {
                // Try to extract object path from URL
                // Common Supabase format: .../public/mstreetstorage/loan-documents/...
                const searchStr = '/mstreetstorage/';
                const index = fileUrl.indexOf(searchStr);
                storagePath = fileUrl.substring(index + searchStr.length);

                // Remove public/ prefix if present
                if (storagePath.startsWith('public/')) {
                    storagePath = storagePath.substring(7);
                }
            } else {
                // Construct path as fallback
                storagePath = `loan-documents/${docRecord.debtor_id}/${docRecord.loan_id}/${docRecord.file_name}`;
            }

            const { data: blob, error: downloadError } = await supabase.storage
                .from('mstreetstorage')
                .download(storagePath);

            if (downloadError) {
                console.error('Download failed for path:', storagePath, downloadError);
                throw new Error(`Failed to download template: ${downloadError.message}`);
            }

            const pdfBytes = await blob.arrayBuffer();

            // Validation: Check if it's actually a PDF
            const unit8 = new Uint8Array(pdfBytes);
            const header = String.fromCharCode(...unit8.slice(0, 5));
            if (header !== '%PDF-') {
                throw new Error('Retrieved document is not a valid PDF. Please contact admin.');
            }

            // 3. Process PDF with pdf-lib
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

            // Embed hand-drawn signature
            const sigImageBase64 = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
            const sigImage = await pdfDoc.embedPng(sigImageBase64);
            const sigDims = sigImage.scale(0.35);

            const pages = pdfDoc.getPages();
            const lastPage = pages[pages.length - 1];
            const { width } = lastPage.getSize();
            const signDate = new Date().toLocaleDateString('en-GB');

            // Draw Professional Signature Block
            const boxX = 50;
            const boxY = 50;
            const boxWidth = width - 100;
            const boxHeight = 100;

            lastPage.drawRectangle({
                x: boxX,
                y: boxY,
                width: boxWidth,
                height: boxHeight,
                color: rgb(0.99, 0.99, 0.99),
                borderColor: rgb(0.85, 0.85, 0.85),
                borderWidth: 1,
            });

            lastPage.drawText('ELECTRONIC SIGNATURE RECORD', {
                x: boxX + 10,
                y: boxY + boxHeight - 15,
                size: 8,
                font: helveticaFont,
                color: rgb(0.5, 0.5, 0.5),
            });

            // Draw the hand-drawn signature
            lastPage.drawImage(sigImage, {
                x: boxX + 20,
                y: boxY + 15,
                width: sigDims.width,
                height: sigDims.height,
            });

            // Draw Signer Details
            lastPage.drawText(`Signer: ${fullName}`, {
                x: boxX + boxWidth - 220,
                y: boxY + 65,
                size: 11,
                font: helveticaFont,
                color: rgb(0.1, 0.1, 0.1),
            });

            lastPage.drawText(`Date: ${signDate}`, {
                x: boxX + boxWidth - 220,
                y: boxY + 45,
                size: 10,
                font: helveticaFont,
                color: rgb(0.3, 0.3, 0.3),
            });

            lastPage.drawText(`Status: Verified Electronic Record`, {
                x: boxX + boxWidth - 220,
                y: boxY + 25,
                size: 8,
                font: helveticaFont,
                color: rgb(0.1, 0.5, 0.1),
            });

            const signedPdfBytes = await pdfDoc.save();

            // 4. Upload Signed Result
            const cleanFileName = documentName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.]/g, '');
            const finalFileName = `signed_${Date.now()}_${cleanFileName}`;
            const targetPath = `loan-documents/${user.id}/${loanId}/${finalFileName}`;

            const { error: uploadError } = await supabase.storage
                .from('mstreetstorage')
                .upload(targetPath, signedPdfBytes, {
                    contentType: 'application/pdf',
                    cacheControl: '3600'
                });

            if (uploadError) throw uploadError;

            // 5. Get and Save URL
            const { data: { publicUrl: signedUrl } } = supabase.storage
                .from('mstreetstorage')
                .getPublicUrl(targetPath);

            const { error: dbUpdateError } = await supabase
                .from('loan_documents')
                .update({
                    is_signed: true,
                    signed_at: new Date().toISOString(),
                    signature_data: fullName,
                    signed_file_url: signedUrl
                })
                .eq('id', documentId);

            if (dbUpdateError) throw dbUpdateError;

            await logActivity('SIGN_DOCUMENT', 'loan_document', documentId, {
                document_name: documentName,
                signed_by: fullName,
                signed_url: signedUrl
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Advanced Signing Error:', err);
            setError(err.message || 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className={styles.iconCircle}>
                            <PenTool size={20} />
                        </div>
                        <div>
                            <h3 className={styles.title}>Sign Document</h3>
                            <p className={styles.subtitle}>{documentName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn} disabled={loading}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.infoBox}>
                        <ShieldCheck size={20} className={styles.infoIcon} />
                        <p>
                            You are about to sign a legally binding agreement for <strong>${loanPrincipal.toLocaleString()}</strong>. Your signature will be electronically embedded into the document.
                        </p>
                    </div>

                    <form onSubmit={handleSign} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Full Name *</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Enter your full legal name"
                                className={styles.input}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Draw Your Signature *</label>
                            <div className={styles.signatureContainer}>
                                <SignatureCanvas
                                    ref={sigPad}
                                    penColor="#111827"
                                    canvasProps={{
                                        className: styles.signaturePad,
                                        width: 500,
                                        height: 150
                                    }}
                                />
                                <button type="button" onClick={clearSignature} className={styles.clearBtn} title="Clear signature">
                                    <Eraser size={14} /> Clear
                                </button>
                            </div>
                            <p className={styles.helperText}>Use your mouse, trackpad or touch screen to sign above</p>
                        </div>

                        <div className={styles.checkboxGroup}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={agreed}
                                    onChange={(e) => setAgreed(e.target.checked)}
                                    className={styles.checkbox}
                                    disabled={loading}
                                />
                                <span>I understand that this electronic signature is as legally binding as a hand-written one.</span>
                            </label>
                        </div>

                        {error && (
                            <div className={styles.errorMessage}>
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                        )}
                    </form>
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.cancelBtn} disabled={loading}>
                        Cancel
                    </button>
                    <button onClick={handleSign} className={styles.submitBtn} disabled={loading || !fullName.trim() || !agreed}>
                        {loading ? <MStreetLoader size={18} color="white" /> : <CheckCircle size={18} />}
                        {loading ? 'Processing...' : 'Adopt & Sign'}
                    </button>
                </div>
            </div>
        </div>
    );
}
