'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { X, Banknote, AlertCircle, CheckCircle, ToggleLeft, ToggleRight, Calculator } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import { createClient } from '@/lib/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';

interface Loan {
    id: string;
    debtor_id: string;
    principal: number;
    interest_rate: number;
    tenure_months: number;
    start_date: string;
    end_date: string;
    status: string;
    amount_repaid?: number;
    interest_repaid?: number;
    reference_no?: string;
    debtor?: {
        full_name: string;
        email: string;
    };
}

interface RecordRepaymentModalProps {
    isOpen: boolean;
    loan: Loan | null;
    onClose: () => void;
    onSuccess: () => void;
}

// Calculate interest accrued based on simple interest formula
function calculateInterestDue(
    principal: number,
    interestRate: number,
    startDate: string,
    interestAlreadyPaid: number = 0
): number {
    const start = new Date(startDate);
    const now = new Date();
    const monthsElapsed = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    // Simple interest: P * R * T / 12 (annualized rate)
    const totalInterest = principal * (interestRate / 100) * (monthsElapsed / 12);
    return Math.max(0, totalInterest - interestAlreadyPaid);
}

export default function RecordRepaymentModal({ isOpen, loan, onClose, onSuccess }: RecordRepaymentModalProps) {
    const { formatCurrency } = useCurrency();
    const { logActivity } = useActivityLog();

    const [isPartialPayment, setIsPartialPayment] = useState(false);
    const [principalAmount, setPrincipalAmount] = useState('');
    const [interestAmount, setInterestAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Calculate amounts due
    const calculations = useMemo(() => {
        if (!loan) return { principalDue: 0, interestDue: 0, totalDue: 0 };

        const principalDue = loan.principal - (loan.amount_repaid || 0);
        const interestDue = calculateInterestDue(
            loan.principal,
            loan.interest_rate,
            loan.start_date,
            loan.interest_repaid || 0
        );

        return {
            principalDue: Math.max(0, principalDue),
            interestDue: Math.max(0, interestDue),
            totalDue: Math.max(0, principalDue) + Math.max(0, interestDue)
        };
    }, [loan]);

    // Auto-fill amounts when modal opens or toggle changes
    useEffect(() => {
        if (loan && isOpen) {
            if (!isPartialPayment) {
                setPrincipalAmount(calculations.principalDue.toFixed(2));
                setInterestAmount(calculations.interestDue.toFixed(2));
            }
        }
    }, [loan, isOpen, isPartialPayment, calculations]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setIsPartialPayment(false);
            setPrincipalAmount('');
            setInterestAmount('');
            setNotes('');
            setError(null);
            setSuccess(false);
        }
    }, [isOpen]);

    if (!isOpen || !loan) return null;

    const totalPayment = (parseFloat(principalAmount) || 0) + (parseFloat(interestAmount) || 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const principalPaid = parseFloat(principalAmount) || 0;
            const interestPaid = parseFloat(interestAmount) || 0;

            if (principalPaid <= 0 && interestPaid <= 0) {
                throw new Error('Please enter a valid payment amount');
            }

            if (principalPaid > calculations.principalDue + 0.01) {
                throw new Error(`Principal amount cannot exceed ${formatCurrency(calculations.principalDue)}`);
            }

            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Determine payment type
            const isFullPayment =
                Math.abs(principalPaid - calculations.principalDue) < 0.01 &&
                Math.abs(interestPaid - calculations.interestDue) < 0.01;
            const paymentType = isFullPayment ? 'full' : 'partial';

            // 1. Insert repayment record
            const { error: repaymentError } = await supabase
                .from('loan_repayments')
                .insert({
                    loan_id: loan.id,
                    amount_principal: principalPaid,
                    amount_interest: interestPaid,
                    payment_type: paymentType,
                    notes: notes || null,
                    recorded_by: user.id
                });

            if (repaymentError) throw repaymentError;

            // 2. Update loan with new repayment totals
            const newAmountRepaid = (loan.amount_repaid || 0) + principalPaid;
            const newInterestRepaid = (loan.interest_repaid || 0) + interestPaid;
            const isPrincipalFullyRepaid = Math.abs(newAmountRepaid - loan.principal) < 0.01;

            const updateData: any = {
                amount_repaid: newAmountRepaid,
                interest_repaid: newInterestRepaid,
            };

            // Update status based on repayment progress
            if (isPrincipalFullyRepaid) {
                updateData.status = 'preliquidated';
            } else if (newAmountRepaid > 0) {
                updateData.status = 'performing'; // Still performing even if partial payment made
            }

            const { error: loanUpdateError } = await supabase
                .from('loans')
                .update(updateData)
                .eq('id', loan.id);

            if (loanUpdateError) throw loanUpdateError;

            // 3. Log the activity
            await logActivity('RECORD_REPAYMENT', 'loan', loan.id, {
                amount_principal: principalPaid,
                amount_interest: interestPaid,
                total_amount: principalPaid + interestPaid,
                payment_type: paymentType,
                is_fully_repaid: isPrincipalFullyRepaid,
                notes
            });

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err: any) {
            console.error('Repayment error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
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
                padding: '32px',
                width: '100%',
                maxWidth: '550px',
                border: '1px solid var(--border-primary)',
                maxHeight: '90vh',
                overflowY: 'auto',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Banknote size={24} />
                        Record Repayment
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
                        <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>Repayment Recorded!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {/* Debtor Info */}
                        <div style={{
                            background: 'var(--bg-tertiary)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '20px',
                        }}>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Receiving payment from:</p>
                            <p style={{ margin: '4px 0 0', color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {loan.debtor?.full_name || 'Unknown Debtor'}
                                {loan.reference_no && (
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{loan.reference_no}</span>
                                )}
                            </p>
                            <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {loan.debtor?.email}
                            </p>
                        </div>

                        {/* Amount Due Summary */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '20px',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <Calculator size={18} style={{ color: 'var(--accent-primary)' }} />
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Amount Due</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Principal Outstanding</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {formatCurrency(calculations.principalDue)}
                                    </p>
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Interest Accrued</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                                        {formatCurrency(calculations.interestDue)}
                                    </p>
                                </div>
                            </div>
                            <div style={{ borderTop: '1px solid var(--border-secondary)', marginTop: '12px', paddingTop: '12px' }}>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Amount Due</p>
                                <p style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }}>
                                    {formatCurrency(calculations.totalDue)}
                                </p>
                            </div>
                        </div>

                        {/* Payment Mode Toggle */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '10px',
                            marginBottom: '20px',
                            cursor: 'pointer',
                        }}
                            onClick={() => setIsPartialPayment(!isPartialPayment)}
                        >
                            <div>
                                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                    {isPartialPayment ? 'Partial Payment' : 'Full Payment'}
                                </span>
                                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {isPartialPayment
                                        ? 'Pay a portion of the amount due'
                                        : 'Pay the full amount due at once'}
                                </p>
                            </div>
                            {isPartialPayment
                                ? <ToggleRight size={28} style={{ color: 'var(--accent-primary)' }} />
                                : <ToggleLeft size={28} style={{ color: 'var(--text-muted)' }} />
                            }
                        </div>

                        {/* Payment Inputs */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    Principal Payment
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={calculations.principalDue}
                                    value={principalAmount}
                                    onChange={(e) => setPrincipalAmount(e.target.value)}
                                    placeholder="0.00"
                                    disabled={!isPartialPayment}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-secondary)',
                                        background: isPartialPayment ? 'var(--bg-input)' : 'var(--bg-tertiary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1rem',
                                        opacity: isPartialPayment ? 1 : 0.7,
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    Interest Payment
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={interestAmount}
                                    onChange={(e) => setInterestAmount(e.target.value)}
                                    placeholder="0.00"
                                    disabled={!isPartialPayment}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-secondary)',
                                        background: isPartialPayment ? 'var(--bg-input)' : 'var(--bg-tertiary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1rem',
                                        opacity: isPartialPayment ? 1 : 0.7,
                                    }}
                                    required
                                />
                            </div>
                        </div>

                        {/* Total Payment */}
                        <div style={{
                            background: 'var(--bg-tertiary)',
                            borderRadius: '10px',
                            padding: '16px',
                            marginBottom: '20px',
                            textAlign: 'center',
                        }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Payment Amount</p>
                            <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                {formatCurrency(totalPayment)}
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
                                placeholder="Add notes about this payment..."
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
                            }}>
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || totalPayment <= 0}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: loading || totalPayment <= 0 ? 'not-allowed' : 'pointer',
                                opacity: loading || totalPayment <= 0 ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }}
                        >
                            {loading ? <MStreetLoader size={18} color="#ffffff" /> : <Banknote size={18} />}
                            {loading ? 'Processing...' : `Confirm ${isPartialPayment ? 'Partial' : 'Full'} Payment`}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
