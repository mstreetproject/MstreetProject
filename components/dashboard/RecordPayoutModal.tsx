'use client';

import React, { useState, useEffect } from 'react';
import { useCreditorPayouts } from '@/hooks/dashboard/useCreditorPayouts';
import { useCurrency } from '@/hooks/useCurrency';
import { X, Banknote, AlertCircle, CheckCircle, Percent, DollarSign, Edit3, Calculator, Info } from 'lucide-react';
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

type PaymentMode = 'both' | 'interest_only' | 'capital_only' | 'custom';

export default function RecordPayoutModal({ isOpen, credit, onClose, onSuccess }: RecordPayoutModalProps) {
    const { recordPayout, calculateInterest, loading } = useCreditorPayouts();
    const { formatCurrency } = useCurrency();

    const [paymentMode, setPaymentMode] = useState<PaymentMode>('both');
    const [principalAmount, setPrincipalAmount] = useState<string>('');
    const [interestAmount, setInterestAmount] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calculate maximum available payout amounts for this placement
    const remainingPrincipal = credit ? (credit.remaining_principal ?? credit.principal) : 0;
    const accruedInterest = credit ? calculateInterest(
        remainingPrincipal,
        credit.interest_rate,
        credit.start_date,
        (credit.interest_type as 'simple' | 'compound') || 'simple'
    ) : 0;
    const totalPayoffBalance = remainingPrincipal + accruedInterest;

    // Apply payment mode presets
    const applyPaymentPreset = (mode: PaymentMode) => {
        setPaymentMode(mode);
        if (mode === 'both') {
            setPrincipalAmount(remainingPrincipal.toFixed(2));
            setInterestAmount(accruedInterest.toFixed(2));
        } else if (mode === 'interest_only') {
            setPrincipalAmount('0.00');
            setInterestAmount(accruedInterest.toFixed(2));
        } else if (mode === 'capital_only') {
            setPrincipalAmount(remainingPrincipal.toFixed(2));
            setInterestAmount('0.00');
        }
    };

    // Auto-fill amounts when modal opens or credit changes
    useEffect(() => {
        if (isOpen && credit) {
            setPaymentMode('both');
            setPrincipalAmount(remainingPrincipal.toFixed(2));
            setInterestAmount(accruedInterest.toFixed(2));
            setNotes('');
            setError(null);
            setSuccess(false);
            setIsSubmitting(false);
        }
    }, [isOpen, credit]);

    if (!isOpen || !credit) return null;

    const actualPrincipal = parseFloat(principalAmount) || 0;
    const actualInterest = parseFloat(interestAmount) || 0;
    const actualTotal = actualPrincipal + actualInterest;

    const variance = actualTotal - totalPayoffBalance;
    const isExceedingPlacementBalance = actualPrincipal > remainingPrincipal + 0.01 || actualTotal > totalPayoffBalance + 0.01;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmitting || loading) return;

        setError(null);

        if (actualPrincipal <= 0 && actualInterest <= 0) {
            setError('Please enter a valid payout amount');
            return;
        }

        if (isExceedingPlacementBalance) {
            setError(`Payout total of ${formatCurrency(actualTotal)} exceeds remaining placement balance (${formatCurrency(totalPayoffBalance)})`);
            return;
        }

        setIsSubmitting(true);

        try {
            // Determine payout type for backend record
            let payoutType: 'interest_only' | 'partial_principal' | 'full_maturity' | 'early_withdrawal';
            if (paymentMode === 'interest_only' || actualPrincipal === 0) {
                payoutType = 'interest_only';
            } else if (Math.abs(actualPrincipal - remainingPrincipal) < 0.01 && Math.abs(actualInterest - accruedInterest) < 0.01) {
                payoutType = 'full_maturity';
            } else {
                payoutType = 'partial_principal';
            }

            await recordPayout(credit.id, actualPrincipal, actualInterest, payoutType, notes || undefined);
            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Failed to record payout');
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
                maxHeight: '90vh',
                overflowY: 'auto',
                border: '1px solid var(--border-primary)',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
                        <Banknote size={22} style={{ color: 'var(--accent-primary)' }} />
                        Record Placement Payout
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
                        <p style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Payout Recorded Successfully!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {/* Two Column Layout: Provider Info & Balance Breakdown */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            {/* Left: Creditor Info */}
                            <div style={{
                                background: 'var(--bg-tertiary)',
                                borderRadius: '10px',
                                padding: '14px',
                                border: '1px solid var(--border-secondary)'
                            }}>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Placement Provider:</p>
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
                                border: '1px solid var(--border-secondary)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Remaining Principal</span>
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(remainingPrincipal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Accrued Interest</span>
                                    <span style={{ color: '#10b981', fontWeight: 600 }}>+{formatCurrency(accruedInterest)}</span>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Total Placement Balance</span>
                                    <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.95rem' }}>{formatCurrency(totalPayoffBalance)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Flexible Payment Mode Preset Buttons */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                Select Payout Structure:
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => applyPaymentPreset('both')}
                                    style={{
                                        padding: '10px 6px',
                                        borderRadius: '8px',
                                        border: paymentMode === 'both' ? '2px solid var(--accent-primary)' : '1px solid var(--border-secondary)',
                                        background: paymentMode === 'both' ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                                        color: paymentMode === 'both' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                        fontWeight: paymentMode === 'both' ? 700 : 500,
                                        fontSize: '0.78rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Banknote size={16} />
                                    <span>Full Both</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => applyPaymentPreset('interest_only')}
                                    style={{
                                        padding: '10px 6px',
                                        borderRadius: '8px',
                                        border: paymentMode === 'interest_only' ? '2px solid #f59e0b' : '1px solid var(--border-secondary)',
                                        background: paymentMode === 'interest_only' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-tertiary)',
                                        color: paymentMode === 'interest_only' ? '#d97706' : 'var(--text-secondary)',
                                        fontWeight: paymentMode === 'interest_only' ? 700 : 500,
                                        fontSize: '0.78rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Percent size={16} />
                                    <span>Interest Only</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => applyPaymentPreset('capital_only')}
                                    style={{
                                        padding: '10px 6px',
                                        borderRadius: '8px',
                                        border: paymentMode === 'capital_only' ? '2px solid #3b82f6' : '1px solid var(--border-secondary)',
                                        background: paymentMode === 'capital_only' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                                        color: paymentMode === 'capital_only' ? '#2563eb' : 'var(--text-secondary)',
                                        fontWeight: paymentMode === 'capital_only' ? 700 : 500,
                                        fontSize: '0.78rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <DollarSign size={16} />
                                    <span>Capital Only</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => applyPaymentPreset('custom')}
                                    style={{
                                        padding: '10px 6px',
                                        borderRadius: '8px',
                                        border: paymentMode === 'custom' ? '2px solid #a855f7' : '1px solid var(--border-secondary)',
                                        background: paymentMode === 'custom' ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-tertiary)',
                                        color: paymentMode === 'custom' ? '#9333ea' : 'var(--text-secondary)',
                                        fontWeight: paymentMode === 'custom' ? 700 : 500,
                                        fontSize: '0.78rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Calculator size={16} />
                                    <span>Custom Amount</span>
                                </button>
                            </div>
                        </div>

                        {/* Editable Component Inputs */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>
                                    Principal Component *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={principalAmount}
                                    onChange={(e) => {
                                        setPrincipalAmount(e.target.value);
                                        setPaymentMode('custom');
                                    }}
                                    placeholder="0.00"
                                    disabled={paymentMode === 'interest_only' || isSubmitting}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-secondary)',
                                        background: paymentMode === 'interest_only' ? 'var(--bg-tertiary)' : 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1rem',
                                        opacity: paymentMode === 'interest_only' ? 0.6 : 1,
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>
                                    Interest Component *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={interestAmount}
                                    onChange={(e) => {
                                        setInterestAmount(e.target.value);
                                        setPaymentMode('custom');
                                    }}
                                    placeholder="0.00"
                                    disabled={paymentMode === 'capital_only' || isSubmitting}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-secondary)',
                                        background: paymentMode === 'capital_only' ? 'var(--bg-tertiary)' : 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1rem',
                                        opacity: paymentMode === 'capital_only' ? 0.6 : 1,
                                    }}
                                    required
                                />
                            </div>
                        </div>

                        {/* Real-Time Calculation & Overpayment Protection Banner */}
                        <div style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            fontSize: '0.825rem',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: isExceedingPlacementBalance
                                ? 'rgba(239, 68, 68, 0.15)'
                                : actualPrincipal === 0 && actualInterest > 0
                                    ? 'rgba(245, 158, 11, 0.12)'
                                    : actualInterest === 0 && actualPrincipal > 0
                                        ? 'rgba(59, 130, 246, 0.12)'
                                        : variance < -0.01
                                            ? 'rgba(239, 68, 68, 0.12)'
                                            : variance > 0.01
                                                ? 'rgba(16, 185, 129, 0.12)'
                                                : 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid ' + (
                                isExceedingPlacementBalance ? 'rgba(239, 68, 68, 0.4)' :
                                actualPrincipal === 0 && actualInterest > 0 ? 'rgba(245, 158, 11, 0.3)' :
                                actualInterest === 0 && actualPrincipal > 0 ? 'rgba(59, 130, 246, 0.3)' :
                                variance < -0.01 ? 'rgba(239, 68, 68, 0.3)' :
                                variance > 0.01 ? 'rgba(16, 185, 129, 0.3)' :
                                'rgba(99, 102, 241, 0.3)'
                            ),
                            color: isExceedingPlacementBalance ? '#ef4444' :
                                   actualPrincipal === 0 && actualInterest > 0 ? '#d97706' :
                                   actualInterest === 0 && actualPrincipal > 0 ? '#2563eb' :
                                   variance < -0.01 ? '#ef4444' :
                                   variance > 0.01 ? '#10b981' :
                                   'var(--text-primary)'
                        }}>
                            <Info size={18} style={{ flexShrink: 0 }} />
                            <div>
                                {isExceedingPlacementBalance ? (
                                    <span><strong>Amount Exceeds Placement Balance:</strong> Payout of {formatCurrency(actualTotal)} exceeds remaining placement balance ({formatCurrency(totalPayoffBalance)}). Reduce custom amount to proceed.</span>
                                ) : actualPrincipal === 0 && actualInterest > 0 ? (
                                    <span><strong>Interest-Only Payout:</strong> {formatCurrency(remainingPrincipal)} capital/principal retained in placement.</span>
                                ) : actualInterest === 0 && actualPrincipal > 0 ? (
                                    <span><strong>Capital-Only Payout:</strong> {formatCurrency(accruedInterest)} interest deferred.</span>
                                ) : variance < -0.01 ? (
                                    <span><strong>Partial Payout:</strong> Shortfall of {formatCurrency(Math.abs(variance))} remaining on placement balance.</span>
                                ) : (
                                    <span><strong>Full Maturity Payout:</strong> Pays out total balance and marks placement as <strong>Withdrawn</strong>.</span>
                                )}
                            </div>
                        </div>

                        {/* Final Payout Amount Card */}
                        <div style={{
                            background: 'var(--bg-tertiary)',
                            borderRadius: '10px',
                            padding: '16px',
                            marginBottom: '20px',
                            textAlign: 'center',
                            border: '1px solid var(--border-secondary)'
                        }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Final Payout Amount</p>
                            <p style={{ margin: '4px 0 0', fontSize: '1.6rem', fontWeight: 800, color: isExceedingPlacementBalance ? '#ef4444' : 'var(--accent-primary)' }}>
                                {formatCurrency(actualTotal)}
                            </p>
                        </div>

                        {/* Notes */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>
                                Notes (Optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add notes about this payout (e.g. Interest payout, Bank ref)..."
                                rows={2}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-secondary)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem',
                                    resize: 'vertical',
                                }}
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.9rem'
                            }}>
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || isSubmitting || actualTotal <= 0 || isExceedingPlacementBalance}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '10px',
                                border: isExceedingPlacementBalance ? '1px solid rgba(239, 68, 68, 0.4)' : 'none',
                                background: isExceedingPlacementBalance
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                color: isExceedingPlacementBalance ? '#ef4444' : 'white',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: (loading || isSubmitting || actualTotal <= 0 || isExceedingPlacementBalance) ? 'not-allowed' : 'pointer',
                                opacity: (loading || isSubmitting || actualTotal <= 0 || isExceedingPlacementBalance) ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }}
                        >
                            {(loading || isSubmitting) ? (
                                <MStreetLoader size={18} color="#ffffff" />
                            ) : isExceedingPlacementBalance ? (
                                <AlertCircle size={18} />
                            ) : (
                                <Banknote size={18} />
                            )}
                            {(loading || isSubmitting)
                                ? 'Processing Payout...'
                                : isExceedingPlacementBalance
                                    ? `Exceeds Placement Balance (${formatCurrency(totalPayoffBalance)})`
                                    : `Confirm ${paymentMode === 'interest_only' ? 'Interest-Only' : paymentMode === 'capital_only' ? 'Capital-Only' : paymentMode === 'custom' ? 'Custom' : 'Full'} Payout`}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
