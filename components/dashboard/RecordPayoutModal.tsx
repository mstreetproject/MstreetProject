'use client';

import React, { useState, useEffect } from 'react';
import { useCreditorPayouts } from '@/hooks/dashboard/useCreditorPayouts';
import { useCurrency } from '@/hooks/useCurrency';
import { X, Banknote, AlertCircle, CheckCircle } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';

interface Credit {
    id: string;
    creditor_id: string;
    principal: number;
    interest_rate: number;
    tenure_months: number;
    start_date: string;
    end_date: string;
    status: string;
    interest_type?: string;
    remaining_principal?: number;
    total_paid_out?: number;
    creditor?: {
        full_name: string;
        email: string;
    };
}

interface RecordPayoutModalProps {
    isOpen: boolean;
    credit: Credit | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RecordPayoutModal({ isOpen, credit, onClose, onSuccess }: RecordPayoutModalProps) {
    const { recordPayout, calculateInterest, loading } = useCreditorPayouts();
    const { formatCurrency } = useCurrency();

    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setNotes('');
            setError(null);
            setSuccess(false);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    if (!isOpen || !credit) return null;

    // Calculate full payout amounts
    const remainingPrincipal = credit.remaining_principal ?? credit.principal;
    const accruedInterest = calculateInterest(
        remainingPrincipal,
        credit.interest_rate,
        credit.start_date,
        (credit.interest_type as 'simple' | 'compound') || 'simple'
    );
    const totalPayout = remainingPrincipal + accruedInterest;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prevent duplicate submissions
        if (isSubmitting || loading) return;

        setError(null);
        setIsSubmitting(true);

        if (totalPayout <= 0) {
            setError('Nothing to pay out');
            setIsSubmitting(false);
            return;
        }

        try {
            // Always do full payout (principal + interest)
            await recordPayout(credit.id, remainingPrincipal, accruedInterest, 'full_maturity', notes || undefined);
            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
        }}>
            <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '16px',
                padding: '28px',
                width: '100%',
                maxWidth: '650px',
                border: '1px solid var(--border-primary)',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
                        <Banknote size={22} />
                        Record Full Payout
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={22} />
                    </button>
                </div>

                {success ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '30px',
                        color: 'var(--success)',
                    }}>
                        <CheckCircle size={42} style={{ marginBottom: '12px' }} />
                        <p style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Payout Recorded!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {/* Two Column Layout */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            {/* Left: Creditor Info */}
                            <div style={{
                                background: 'var(--bg-tertiary)',
                                borderRadius: '10px',
                                padding: '14px',
                            }}>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Paying out to:</p>
                                <p style={{ margin: '4px 0 0', color: 'var(--text-primary)', fontWeight: 600 }}>
                                    {credit.creditor?.full_name || 'Unknown'}
                                </p>
                                <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    {credit.creditor?.email}
                                </p>
                            </div>

                            {/* Right: Payout Breakdown */}
                            <div style={{
                                background: 'var(--bg-tertiary)',
                                borderRadius: '10px',
                                padding: '14px',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Principal</span>
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{formatCurrency(remainingPrincipal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Interest</span>
                                    <span style={{ color: 'var(--success)', fontWeight: 500 }}>+{formatCurrency(accruedInterest)}</span>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Total</span>
                                    <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{formatCurrency(totalPayout)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes + Warning Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            {/* Notes */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add notes..."
                                    rows={2}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-secondary)',
                                        background: 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.9rem',
                                        resize: 'none',
                                    }}
                                />
                            </div>

                            {/* Warning */}
                            <div style={{
                                background: 'var(--warning-bg)',
                                border: '1px solid var(--warning)',
                                borderRadius: '8px',
                                padding: '10px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                            }}>
                                <AlertCircle size={18} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }} />
                                <p style={{ margin: 0, color: 'var(--warning)', fontSize: '0.85rem' }}>
                                    This will pay out the full amount and mark credit as <strong>Withdrawn</strong>.
                                </p>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{
                                background: 'var(--danger-bg)',
                                color: 'var(--danger)',
                                padding: '10px',
                                borderRadius: '8px',
                                marginBottom: '12px',
                                fontSize: '0.9rem',
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || isSubmitting}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: (loading || isSubmitting) ? 'not-allowed' : 'pointer',
                                opacity: (loading || isSubmitting) ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }}
                        >
                            {(loading || isSubmitting) ? <MStreetLoader size={18} color="#ffffff" /> : <Banknote size={18} />}
                            {(loading || isSubmitting) ? 'Processing...' : `Pay ${formatCurrency(totalPayout)}`}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
