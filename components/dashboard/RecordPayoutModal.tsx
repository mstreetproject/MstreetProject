'use client';

import React, { useState, useEffect } from 'react';
import { useCreditorPayouts } from '@/hooks/dashboard/useCreditorPayouts';
import { useCurrency } from '@/hooks/useCurrency';
import { X, Loader2, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

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

    const [payoutType, setPayoutType] = useState<'interest_only' | 'partial_principal' | 'full_maturity' | 'early_withdrawal'>('full_maturity');
    const [principalAmount, setPrincipalAmount] = useState('');
    const [interestAmount, setInterestAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Calculate values when credit changes
    useEffect(() => {
        if (credit) {
            const remaining = credit.remaining_principal ?? credit.principal;
            const interest = calculateInterest(
                remaining,
                credit.interest_rate,
                credit.start_date,
                (credit.interest_type as 'simple' | 'compound') || 'simple'
            );

            // Default based on payout type
            if (payoutType === 'full_maturity' || payoutType === 'early_withdrawal') {
                setPrincipalAmount(remaining.toFixed(2));
                setInterestAmount(interest.toFixed(2));
            } else if (payoutType === 'interest_only') {
                setPrincipalAmount('0');
                setInterestAmount(interest.toFixed(2));
            } else {
                setPrincipalAmount('');
                setInterestAmount('');
            }
        }
    }, [credit, payoutType, calculateInterest]);

    if (!isOpen || !credit) return null;

    const remainingPrincipal = credit.remaining_principal ?? credit.principal;
    const accruedInterest = calculateInterest(
        remainingPrincipal,
        credit.interest_rate,
        credit.start_date,
        (credit.interest_type as 'simple' | 'compound') || 'simple'
    );
    const currentValue = remainingPrincipal + accruedInterest;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const principal = parseFloat(principalAmount) || 0;
        const interest = parseFloat(interestAmount) || 0;

        if (principal + interest <= 0) {
            setError('Total payout must be greater than 0');
            return;
        }

        if (principal > remainingPrincipal) {
            setError(`Principal cannot exceed remaining balance (${formatCurrency(remainingPrincipal)})`);
            return;
        }

        try {
            await recordPayout(credit.id, principal, interest, payoutType, notes || undefined);
            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
                setSuccess(false);
                setPrincipalAmount('');
                setInterestAmount('');
                setNotes('');
            }, 1500);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const isFullPayout = payoutType === 'full_maturity' || payoutType === 'early_withdrawal';

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
                padding: '32px',
                width: '100%',
                maxWidth: '500px',
                border: '1px solid var(--border-primary)',
                maxHeight: '90vh',
                overflowY: 'auto',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={24} />
                        Record Payout
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                {success ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: 'var(--success)',
                    }}>
                        <CheckCircle size={48} style={{ marginBottom: '16px' }} />
                        <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>Payout Recorded!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {/* Creditor Info */}
                        <div style={{
                            background: 'var(--bg-tertiary)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '20px',
                        }}>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Paying out to:</p>
                            <p style={{ margin: '4px 0 0', color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.1rem' }}>
                                {credit.creditor?.full_name || 'Unknown Creditor'}
                            </p>
                            <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {credit.creditor?.email}
                            </p>
                        </div>

                        {/* Balance Summary */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '12px',
                            marginBottom: '20px',
                        }}>
                            <div style={{ background: 'var(--accent-bg)', padding: '12px', borderRadius: '8px' }}>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Remaining Principal</p>
                                <p style={{ margin: '4px 0 0', color: 'var(--accent-primary)', fontWeight: 700 }}>
                                    {formatCurrency(remainingPrincipal)}
                                </p>
                            </div>
                            <div style={{ background: 'var(--success-bg)', padding: '12px', borderRadius: '8px' }}>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Interest Accrued</p>
                                <p style={{ margin: '4px 0 0', color: 'var(--success)', fontWeight: 700 }}>
                                    {formatCurrency(accruedInterest)}
                                </p>
                            </div>
                            <div style={{ background: 'var(--warning-bg)', padding: '12px', borderRadius: '8px', gridColumn: 'span 2' }}>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Current Total Value</p>
                                <p style={{ margin: '4px 0 0', color: 'var(--warning)', fontWeight: 700, fontSize: '1.2rem' }}>
                                    {formatCurrency(currentValue)}
                                </p>
                            </div>
                        </div>

                        {/* Payout Type */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                Payout Type
                            </label>
                            <select
                                value={payoutType}
                                onChange={(e) => setPayoutType(e.target.value as any)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-secondary)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-primary)',
                                    fontSize: '1rem',
                                }}
                            >
                                <option value="full_maturity">Full Maturity Payout (Principal + Interest)</option>
                                <option value="early_withdrawal">Early Withdrawal (Full)</option>
                                <option value="interest_only">Interest Only</option>
                                <option value="partial_principal">Partial Withdrawal</option>
                            </select>
                        </div>

                        {/* Amount Inputs */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    Principal Amount
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={principalAmount}
                                    onChange={(e) => setPrincipalAmount(e.target.value)}
                                    disabled={payoutType === 'interest_only' || isFullPayout}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-secondary)',
                                        background: isFullPayout || payoutType === 'interest_only' ? 'var(--bg-tertiary)' : 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1rem',
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    Interest Amount
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={interestAmount}
                                    onChange={(e) => setInterestAmount(e.target.value)}
                                    disabled={payoutType === 'full_maturity'}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-secondary)',
                                        background: isFullPayout ? 'var(--bg-tertiary)' : 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1rem',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Total */}
                        <div style={{
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                            padding: '16px',
                            borderRadius: '12px',
                            marginBottom: '20px',
                            textAlign: 'center',
                        }}>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>Total Payout</p>
                            <p style={{ margin: '4px 0 0', color: 'white', fontWeight: 700, fontSize: '1.5rem' }}>
                                {formatCurrency((parseFloat(principalAmount) || 0) + (parseFloat(interestAmount) || 0))}
                            </p>
                        </div>

                        {/* Notes */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                Notes (Optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any notes about this payout..."
                                rows={2}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-secondary)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-primary)',
                                    fontSize: '1rem',
                                    resize: 'vertical',
                                }}
                            />
                        </div>

                        {/* Warning for full payout */}
                        {isFullPayout && (
                            <div style={{
                                background: 'var(--warning-bg)',
                                border: '1px solid var(--warning)',
                                borderRadius: '8px',
                                padding: '12px',
                                marginBottom: '20px',
                                display: 'flex',
                                gap: '8px',
                            }}>
                                <AlertCircle size={20} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                                <p style={{ margin: 0, color: 'var(--warning)', fontSize: '0.9rem' }}>
                                    This will mark the credit as <strong>Withdrawn</strong> and remove it from active credits.
                                </p>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div style={{
                                background: 'var(--danger-bg)',
                                color: 'var(--danger)',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <DollarSign size={18} />}
                            {loading ? 'Processing...' : 'Confirm Payout'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
