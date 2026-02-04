'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import SignatureCanvas from 'react-signature-canvas';
import { createClient } from '@/lib/supabase/client';
import MStreetLoader from '@/components/ui/MStreetLoader';
import {
    FileText,
    Mail,
    CheckCircle,
    AlertCircle,
    PenTool,
    ShieldCheck,
    Eraser,
    X,
    Eye
} from 'lucide-react';

interface DocumentData {
    id: string;
    file_url: string;
    file_name: string;
    loan_id: string;
    debtor_id: string;
    is_signed: boolean;
    debtor_email: string;
    debtor_name: string;
    loan_principal: number;
}

export default function PublicSignPage() {
    const params = useParams();
    const documentId = params.documentId as string;

    const [loading, setLoading] = useState(true);
    const [documentData, setDocumentData] = useState<DocumentData | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Email verification step
    const [emailInput, setEmailInput] = useState('');
    const [emailVerified, setEmailVerified] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // Document preview step
    const [documentReviewed, setDocumentReviewed] = useState(false);

    // Signing step
    const sigPad = useRef<any>(null);
    const [signing, setSigning] = useState(false);
    const [fullName, setFullName] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [signError, setSignError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Fetch document data
    useEffect(() => {
        async function fetchDocument() {
            try {
                const supabase = createClient();

                const { data, error: fetchErr } = await supabase
                    .from('loan_documents')
                    .select(`
                        id,
                        file_url,
                        file_name,
                        loan_id,
                        debtor_id,
                        is_signed,
                        loans!inner(principal, debtor:users!loans_debtor_id_fkey(email, full_name))
                    `)
                    .eq('id', documentId)
                    .single();

                if (fetchErr || !data) {
                    setError('Document not found or has been removed.');
                    return;
                }

                const loan = data.loans as any;

                setDocumentData({
                    id: data.id,
                    file_url: data.file_url,
                    file_name: data.file_name,
                    loan_id: data.loan_id,
                    debtor_id: data.debtor_id,
                    is_signed: data.is_signed,
                    debtor_email: loan?.debtor?.email || '',
                    debtor_name: loan?.debtor?.full_name || '',
                    loan_principal: loan?.principal || 0
                });

            } catch (err) {
                console.error('Error fetching document:', err);
                setError('Failed to load document.');
            } finally {
                setLoading(false);
            }
        }

        if (documentId) {
            fetchDocument();
        }
    }, [documentId]);

    // Email verification handler
    const handleEmailVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifying(true);
        setError(null);

        if (emailInput.toLowerCase().trim() === documentData?.debtor_email.toLowerCase().trim()) {
            setEmailVerified(true);
            setFullName(documentData?.debtor_name || '');
        } else {
            setError('Email does not match our records. Please check and try again.');
        }
        setVerifying(false);
    };

    // Clear signature
    const clearSignature = () => {
        if (sigPad.current) {
            sigPad.current.clear();
        }
    };

    // Handle signing
    const handleSign = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!fullName.trim() || !agreed) {
            setSignError('Please provide your full name and agree to the terms.');
            return;
        }

        if (sigPad.current?.isEmpty()) {
            setSignError('Please draw your signature in the pad provided.');
            return;
        }

        setSigning(true);
        setSignError(null);

        try {
            const supabase = createClient();

            // 1. Resolve storage path and download
            let storagePath = '';
            const fileUrl = documentData!.file_url;

            if (fileUrl.includes('/mstreetstorage/')) {
                const searchStr = '/mstreetstorage/';
                const index = fileUrl.indexOf(searchStr);
                storagePath = fileUrl.substring(index + searchStr.length);
                if (storagePath.startsWith('public/')) {
                    storagePath = storagePath.substring(7);
                }
            } else {
                storagePath = `loan-documents/${documentData!.debtor_id}/${documentData!.loan_id}/${documentData!.file_name}`;
            }

            const { data: blob, error: downloadError } = await supabase.storage
                .from('mstreetstorage')
                .download(storagePath);

            if (downloadError) throw new Error(`Failed to download template: ${downloadError.message}`);

            const pdfBytes = await blob.arrayBuffer();

            // Validate PDF
            const unit8 = new Uint8Array(pdfBytes);
            const header = String.fromCharCode(...unit8.slice(0, 5));
            if (header !== '%PDF-') {
                throw new Error('Retrieved document is not a valid PDF. Please contact support.');
            }

            // 2. Process PDF with pdf-lib
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

            // Embed signature
            const sigImageBase64 = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
            const sigImage = await pdfDoc.embedPng(sigImageBase64);
            const sigDims = sigImage.scale(0.35);

            const pages = pdfDoc.getPages();
            const lastPage = pages[pages.length - 1];
            const { width } = lastPage.getSize();
            const signDate = new Date().toLocaleDateString('en-GB');

            // Draw signature block
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

            lastPage.drawImage(sigImage, {
                x: boxX + 20,
                y: boxY + 15,
                width: sigDims.width,
                height: sigDims.height,
            });

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

            // 3. Upload signed PDF
            const cleanFileName = documentData!.file_name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.]/g, '');
            const finalFileName = `signed_${Date.now()}_${cleanFileName}`;
            const targetPath = `loan-documents/${documentData!.debtor_id}/${documentData!.loan_id}/${finalFileName}`;

            const { error: uploadError } = await supabase.storage
                .from('mstreetstorage')
                .upload(targetPath, signedPdfBytes, {
                    contentType: 'application/pdf',
                    cacheControl: '3600'
                });

            if (uploadError) throw uploadError;

            // 4. Get public URL and update database
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
                .eq('id', documentData!.id);

            if (dbUpdateError) throw dbUpdateError;

            setSuccess(true);

        } catch (err: any) {
            console.error('Signing Error:', err);
            setSignError(err.message || 'Signing failed. Please try again.');
        } finally {
            setSigning(false);
        }
    };

    // Styles
    const containerStyle: React.CSSProperties = {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
    };

    const cardStyle: React.CSSProperties = {
        background: '#1e293b',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        maxWidth: '550px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
    };

    const headerStyle: React.CSSProperties = {
        padding: '24px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(99, 102, 241, 0.1)'
    };

    const contentStyle: React.CSSProperties = {
        padding: '24px'
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px 16px',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '10px',
        color: 'white',
        fontSize: '1rem',
        outline: 'none'
    };

    const btnStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        border: 'none',
        borderRadius: '10px',
        color: 'white',
        fontWeight: 600,
        fontSize: '1rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
    };

    // Loading state
    if (loading) {
        return (
            <div style={containerStyle}>
                <MStreetLoader size={80} />
            </div>
        );
    }

    // Error state
    if (error && !documentData) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <div style={{ ...contentStyle, textAlign: 'center' }}>
                        <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
                        <h2 style={{ color: 'white', marginBottom: '8px' }}>Error</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)' }}>{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Already signed
    if (documentData?.is_signed) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <div style={{ ...contentStyle, textAlign: 'center' }}>
                        <CheckCircle size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
                        <h2 style={{ color: 'white', marginBottom: '8px' }}>Already Signed</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)' }}>This document has already been signed.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <div style={{ ...contentStyle, textAlign: 'center' }}>
                        <CheckCircle size={64} style={{ color: '#10b981', marginBottom: '16px' }} />
                        <h2 style={{ color: 'white', marginBottom: '8px' }}>Document Signed!</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
                            Your signature has been successfully applied to the document.
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                            You can now close this window.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Email verification step
    if (!emailVerified) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <div style={headerStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: 'rgba(99, 102, 241, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#6366f1'
                            }}>
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 style={{ color: 'white', margin: 0, fontSize: '1.1rem' }}>Sign Document</h3>
                                <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', fontSize: '0.85rem' }}>
                                    {documentData?.file_name}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={contentStyle}>
                        <div style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '24px',
                            display: 'flex',
                            gap: '12px'
                        }}>
                            <ShieldCheck size={20} style={{ color: '#6366f1', flexShrink: 0, marginTop: '2px' }} />
                            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
                                To verify your identity, please enter the email address associated with this loan.
                            </p>
                        </div>

                        <form onSubmit={handleEmailVerify}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
                                    <Mail size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                    Your Email Address
                                </label>
                                <input
                                    type="email"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    placeholder="Enter your email"
                                    style={inputStyle}
                                    required
                                />
                            </div>

                            {error && (
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: '#ef4444',
                                    fontSize: '0.9rem'
                                }}>
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <button type="submit" style={btnStyle} disabled={verifying}>
                                {verifying ? <MStreetLoader size={18} color="white" /> : <CheckCircle size={18} />}
                                {verifying ? 'Verifying...' : 'Verify & Continue'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // Document preview step - show document before signing
    if (!documentReviewed) {
        const isPdf = documentData?.file_url.toLowerCase().endsWith('.pdf');
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(documentData?.file_url || '');

        return (
            <div style={{ ...containerStyle, padding: '20px' }}>
                <div style={{
                    ...cardStyle,
                    maxWidth: '900px',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '90vh'
                }}>
                    <div style={headerStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: 'rgba(99, 102, 241, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#6366f1'
                            }}>
                                <Eye size={20} />
                            </div>
                            <div>
                                <h3 style={{ color: 'white', margin: 0, fontSize: '1.1rem' }}>Review Document</h3>
                                <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', fontSize: '0.85rem' }}>
                                    Please read the agreement carefully before signing
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={{
                        flex: 1,
                        padding: '16px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Document info bar */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '10px',
                            marginBottom: '16px'
                        }}>
                            <FileText size={18} style={{ color: '#6366f1' }} />
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, color: 'white', fontWeight: 500, fontSize: '0.9rem' }}>
                                    {documentData?.file_name}
                                </p>
                                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                                    Loan Amount: <strong style={{ color: '#10b981' }}>₦{documentData?.loan_principal.toLocaleString()}</strong>
                                </p>
                            </div>
                        </div>

                        {/* Document viewer */}
                        <div style={{
                            flex: 1,
                            background: '#fff',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            minHeight: '400px'
                        }}>
                            {isPdf ? (
                                <iframe
                                    src={`${documentData?.file_url}#toolbar=1`}
                                    style={{ width: '100%', height: '100%', border: 'none', minHeight: '400px' }}
                                    title="Document Preview"
                                />
                            ) : isImage ? (
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '20px',
                                    background: '#f8fafc'
                                }}>
                                    <img
                                        src={documentData?.file_url}
                                        alt="Document"
                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                    />
                                </div>
                            ) : (
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '40px',
                                    textAlign: 'center'
                                }}>
                                    <FileText size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
                                    <p style={{ color: '#64748b', marginBottom: '16px' }}>Preview not available</p>
                                    <a
                                        href={documentData?.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            padding: '10px 20px',
                                            background: '#6366f1',
                                            color: 'white',
                                            borderRadius: '8px',
                                            textDecoration: 'none',
                                            fontWeight: 500
                                        }}
                                    >
                                        Open Document
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.2)'
                    }}>
                        <button
                            onClick={() => setDocumentReviewed(true)}
                            style={{
                                ...btnStyle,
                                background: 'linear-gradient(135deg, #10b981, #059669)'
                            }}
                        >
                            <CheckCircle size={18} />
                            I have reviewed this document - Proceed to Sign
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Signing step
    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <div style={headerStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'rgba(99, 102, 241, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6366f1'
                        }}>
                            <PenTool size={20} />
                        </div>
                        <div>
                            <h3 style={{ color: 'white', margin: 0, fontSize: '1.1rem' }}>Sign Your Agreement</h3>
                            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', fontSize: '0.85rem' }}>
                                {documentData?.file_name}
                            </p>
                        </div>
                    </div>
                </div>

                <div style={contentStyle}>
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '24px',
                        display: 'flex',
                        gap: '12px'
                    }}>
                        <ShieldCheck size={20} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
                            You are signing a legally binding agreement for <strong style={{ color: '#10b981' }}>₦{documentData?.loan_principal.toLocaleString()}</strong>.
                        </p>
                    </div>

                    <form onSubmit={handleSign}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
                                Full Name *
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Enter your full legal name"
                                style={inputStyle}
                                required
                                disabled={signing}
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
                                Draw Your Signature *
                            </label>
                            <div style={{
                                background: 'white',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                position: 'relative'
                            }}>
                                <SignatureCanvas
                                    ref={sigPad}
                                    penColor="#111827"
                                    canvasProps={{
                                        width: 500,
                                        height: 150,
                                        style: { width: '100%', height: '150px' }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={clearSignature}
                                    style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        right: '8px',
                                        padding: '4px 10px',
                                        fontSize: '0.75rem',
                                        background: 'rgba(0,0,0,0.1)',
                                        border: '1px solid rgba(0,0,0,0.2)',
                                        borderRadius: '4px',
                                        color: '#666',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <Eraser size={12} /> Clear
                                </button>
                            </div>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: '6px', fontStyle: 'italic' }}>
                                Use your finger, mouse, or touchpad to sign above
                            </p>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'flex', gap: '12px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                                <input
                                    type="checkbox"
                                    checked={agreed}
                                    onChange={(e) => setAgreed(e.target.checked)}
                                    disabled={signing}
                                    style={{ marginTop: '2px', width: '16px', height: '16px' }}
                                />
                                <span>I understand that this electronic signature is as legally binding as a hand-written one.</span>
                            </label>
                        </div>

                        {signError && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '8px',
                                padding: '12px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: '#ef4444',
                                fontSize: '0.9rem'
                            }}>
                                <AlertCircle size={16} />
                                {signError}
                            </div>
                        )}

                        <button
                            type="submit"
                            style={{
                                ...btnStyle,
                                opacity: !fullName.trim() || !agreed ? 0.6 : 1,
                                cursor: !fullName.trim() || !agreed ? 'not-allowed' : 'pointer'
                            }}
                            disabled={signing || !fullName.trim() || !agreed}
                        >
                            {signing ? <MStreetLoader size={18} color="white" /> : <CheckCircle size={18} />}
                            {signing ? 'Processing...' : 'Adopt & Sign'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
