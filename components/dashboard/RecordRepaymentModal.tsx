'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { X, Banknote, AlertCircle, CheckCircle, ToggleLeft, ToggleRight, Calculator, Calendar, List, Info, Edit3, Percent, DollarSign } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import { createClient } from '@/lib/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useRepaymentSchedule, RepaymentScheduleItem } from '@/hooks/dashboard/useRepaymentSchedule';
import DataTable from './DataTable';

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

type PaymentMode = 'both' | 'interest_only' | 'capital_only' | 'custom';

// Calculate interest accrued based on monthly flat interest formula
function calculateInterestDue(
    principal: number,
    interestRate: number,
    startDate: string,
    interestAlreadyPaid: number = 0,
    tenureMonths?: number
): number {
    const start = new Date(startDate);
    const now = new Date();
    const daysElapsed = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const avgDaysPerMonth = 30.4167;
    const monthsElapsed = daysElapsed / avgDaysPerMonth;

    // Monthly flat interest: P * (R_monthly / 100) * monthsElapsed
    const rawInterest = principal * (interestRate / 100) * monthsElapsed;
    
    // If tenureMonths is available, cap accrued interest at maturity interest
    const maxInterest = tenureMonths ? principal * (interestRate / 100) * tenureMonths : rawInterest;
    const totalInterest = Math.min(rawInterest, maxInterest);

    return Math.max(0, totalInterest - interestAlreadyPaid);
}

export default function RecordRepaymentModal({ isOpen, loan, onClose, onSuccess }: RecordRepaymentModalProps) {
    const { formatCurrency } = useCurrency();
    const { logActivity } = useActivityLog();

    const [isPartialPayment, setIsPartialPayment] = useState(false);
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('both');
    const [principalAmount, setPrincipalAmount] = useState('');
    const [interestAmount, setInterestAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [selectedScheduleIndex, setSelectedScheduleIndex] = useState<number | null>(null);

    const {
        schedule,
        loading: loadingSchedule,
        updateInstallmentStatus
    } = useRepaymentSchedule(isOpen && loan ? loan.id : '');

    // Calculate amounts due
    const calculations = useMemo(() => {
        if (!loan) return { principalDue: 0, interestDue: 0, totalDue: 0 };

        const principalDue = loan.principal - (loan.amount_repaid || 0);
        const interestDue = calculateInterestDue(
            loan.principal,
            loan.interest_rate,
            loan.start_date,
            loan.interest_repaid || 0,
            loan.tenure_months
        );

        return {
            principalDue: Math.max(0, principalDue),
            interestDue: Math.max(0, interestDue),
            totalDue: Math.max(0, principalDue) + Math.max(0, interestDue)
        };
    }, [loan]);

    // Apply payment mode presets to an item or default loan due
    const applyPaymentPreset = (mode: PaymentMode, pDue: number, iDue: number) => {
        setPaymentMode(mode);
        if (mode === 'both') {
            setPrincipalAmount(pDue.toFixed(2));
            setInterestAmount(iDue.toFixed(2));
            setIsPartialPayment(false);
        } else if (mode === 'interest_only') {
            setPrincipalAmount('0.00');
            setInterestAmount(iDue.toFixed(2));
            setIsPartialPayment(true);
        } else if (mode === 'capital_only') {
            setPrincipalAmount(pDue.toFixed(2));
            setInterestAmount('0.00');
            setIsPartialPayment(true);
        } else if (mode === 'custom') {
            setIsPartialPayment(true);
        }
    };

    // Helper to select an installment from schedule
    const handleSelectScheduleItem = (row: RepaymentScheduleItem, index: number, mode: PaymentMode = 'both') => {
        if (row.status === 'paid') return;
        setSelectedScheduleIndex(index);
        applyPaymentPreset(mode, row.principal_amount, row.interest_amount);
    };

    // Auto-select first pending schedule item when modal opens or schedule loads
    useEffect(() => {
        if (loan && isOpen && selectedScheduleIndex === null) {
            if (schedule.length > 0) {
                const firstPendingIdx = schedule.findIndex(s => s.status !== 'paid');
                const targetIdx = firstPendingIdx !== -1 ? firstPendingIdx : 0;
                const item = schedule[targetIdx];
                if (item && item.status !== 'paid') {
                    setSelectedScheduleIndex(targetIdx);
                    setPrincipalAmount(item.principal_amount.toFixed(2));
                    setInterestAmount(item.interest_amount.toFixed(2));
                    setPaymentMode('both');
                    return;
                }
            }
            if (!isPartialPayment) {
                const defaultPrincipal = schedule.length > 0 ? (loan.principal / loan.tenure_months) : calculations.principalDue;
                setPrincipalAmount(defaultPrincipal.toFixed(2));
                setInterestAmount(calculations.interestDue.toFixed(2));
                setPaymentMode('both');
            }
        }
    }, [loan, isOpen, isPartialPayment, calculations, selectedScheduleIndex, schedule]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setIsPartialPayment(false);
            setPaymentMode('both');
            setPrincipalAmount('');
            setInterestAmount('');
            setNotes('');
            setError(null);
            setSuccess(false);
            setSelectedScheduleIndex(null);
        }
    }, [isOpen]);

    if (!isOpen || !loan) return null;

    const totalPayment = (parseFloat(principalAmount) || 0) + (parseFloat(interestAmount) || 0);
    const selectedScheduleItem = selectedScheduleIndex !== null ? schedule[selectedScheduleIndex] : null;

    // Active schedule item reference for presets
    const activeScheduleItem = selectedScheduleItem || schedule.find(s => s.status !== 'paid') || schedule[0] || null;

    // Variance Calculations
    const expectedPrincipal = activeScheduleItem ? activeScheduleItem.principal_amount : (schedule.length > 0 ? loan.principal / loan.tenure_months : calculations.principalDue);
    const expectedInterest = activeScheduleItem ? activeScheduleItem.interest_amount : calculations.interestDue;
    const expectedTotal = expectedPrincipal + expectedInterest;
    const actualPrincipal = parseFloat(principalAmount) || 0;
    const actualInterest = parseFloat(interestAmount) || 0;
    const actualTotal = actualPrincipal + actualInterest;
    const variance = actualTotal - expectedTotal;

    // Total Remaining Payoff Balance for Entire Loan Cycle
    const totalRemainingPayoff = calculations.principalDue + calculations.interestDue;
    const isExceedingTotalLoan = actualPrincipal > calculations.principalDue + 0.01 || actualTotal > totalRemainingPayoff + 0.01;

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

            if (isExceedingTotalLoan) {
                throw new Error(`Total payment of ${formatCurrency(actualTotal)} exceeds the remaining loan cycle payoff balance (${formatCurrency(totalRemainingPayoff)})`);
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
                updateData.status = 'performing';
            }

            const { error: loanUpdateError } = await supabase
                .from('loans')
                .update(updateData)
                .eq('id', loan.id);

            if (loanUpdateError) throw loanUpdateError;

            // 3. Mark matching schedule installments as paid
            if (schedule.length > 0) {
                let remainingPrincipal = principalPaid;
                let remainingInterest = interestPaid;

                for (const item of schedule) {
                    if (item.status === 'paid') continue;

                    if (remainingPrincipal >= item.principal_amount - 0.01 &&
                        remainingInterest >= item.interest_amount - 0.01) {

                        await updateInstallmentStatus(item.id, 'paid');
                        remainingPrincipal -= item.principal_amount;
                        remainingInterest -= item.interest_amount;
                    } else if (remainingPrincipal > 0 || remainingInterest > 0) {
                        await updateInstallmentStatus(item.id, 'partial');
                        break;
                    }
                }
            }

            // 4. Log the activity
            await logActivity('RECORD_REPAYMENT', 'loan', loan.id, {
                amount_principal: principalPaid,
                amount_interest: interestPaid,
                total_amount: principalPaid + interestPaid,
                payment_type: paymentType,
                payment_mode: paymentMode,
                variance: variance,
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
            background: 'rgba(0,0,0,0.65)',
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
                maxWidth: '680px',
                border: '1px solid var(--border-primary)',
                maxHeight: '92vh',
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
                        <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>Repayment Recorded Successfully!</p>
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
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Outstanding Amount Due</span>
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

                        {/* Flexible Payment Mode Preset Buttons */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                Select Payment Mode / Structure:
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => applyPaymentPreset('both', activeScheduleItem ? activeScheduleItem.principal_amount : (schedule.length > 0 ? loan.principal / loan.tenure_months : calculations.principalDue), activeScheduleItem ? activeScheduleItem.interest_amount : calculations.interestDue)}
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
                                    onClick={() => applyPaymentPreset('interest_only', activeScheduleItem ? activeScheduleItem.principal_amount : (schedule.length > 0 ? loan.principal / loan.tenure_months : calculations.principalDue), activeScheduleItem ? activeScheduleItem.interest_amount : calculations.interestDue)}
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
                                    onClick={() => applyPaymentPreset('capital_only', activeScheduleItem ? activeScheduleItem.principal_amount : (schedule.length > 0 ? loan.principal / loan.tenure_months : calculations.principalDue), activeScheduleItem ? activeScheduleItem.interest_amount : calculations.interestDue)}
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
                                    onClick={() => applyPaymentPreset('custom', activeScheduleItem ? activeScheduleItem.principal_amount : (schedule.length > 0 ? loan.principal / loan.tenure_months : calculations.principalDue), activeScheduleItem ? activeScheduleItem.interest_amount : calculations.interestDue)}
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
                                    <Edit3 size={16} />
                                    <span>Custom Amount</span>
                                </button>
                            </div>
                        </div>

                        {/* Payment Inputs */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>
                                    Principal Component
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={principalAmount}
                                    onChange={(e) => {
                                        setPrincipalAmount(e.target.value);
                                        setPaymentMode('custom');
                                        setIsPartialPayment(true);
                                    }}
                                    placeholder="0.00"
                                    disabled={paymentMode === 'interest_only'}
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
                                    Interest Component
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={interestAmount}
                                    onChange={(e) => {
                                        setInterestAmount(e.target.value);
                                        setPaymentMode('custom');
                                        setIsPartialPayment(true);
                                    }}
                                    placeholder="0.00"
                                    disabled={paymentMode === 'capital_only'}
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

                        {/* Real-Time Variance Calculation Banner */}
                        <div style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            fontSize: '0.825rem',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: isExceedingTotalLoan
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
                                isExceedingTotalLoan ? 'rgba(239, 68, 68, 0.4)' :
                                actualPrincipal === 0 && actualInterest > 0 ? 'rgba(245, 158, 11, 0.3)' :
                                actualInterest === 0 && actualPrincipal > 0 ? 'rgba(59, 130, 246, 0.3)' :
                                variance < -0.01 ? 'rgba(239, 68, 68, 0.3)' :
                                variance > 0.01 ? 'rgba(16, 185, 129, 0.3)' :
                                'rgba(99, 102, 241, 0.3)'
                            ),
                            color: isExceedingTotalLoan ? '#ef4444' :
                                   actualPrincipal === 0 && actualInterest > 0 ? '#d97706' :
                                   actualInterest === 0 && actualPrincipal > 0 ? '#2563eb' :
                                   variance < -0.01 ? '#ef4444' :
                                   variance > 0.01 ? '#10b981' :
                                   'var(--text-primary)'
                        }}>
                            <Info size={18} style={{ flexShrink: 0 }} />
                            <div>
                                {isExceedingTotalLoan ? (
                                    <span><strong>Amount Exceeds Total Loan Balance:</strong> Payment of {formatCurrency(actualTotal)} exceeds remaining loan cycle balance ({formatCurrency(totalRemainingPayoff)}). Reduce custom amount to proceed.</span>
                                ) : actualPrincipal === 0 && actualInterest > 0 ? (
                                    <span><strong>Interest-Only Payment:</strong> {formatCurrency(expectedPrincipal)} capital/principal deferred to remaining loan balance.</span>
                                ) : actualInterest === 0 && actualPrincipal > 0 ? (
                                    <span><strong>Capital-Only Payment:</strong> {formatCurrency(expectedInterest)} interest deferred for this period.</span>
                                ) : variance < -0.01 ? (
                                    <span><strong>Underpayment Shortfall:</strong> {formatCurrency(Math.abs(variance))} remaining shortfall on installment.</span>
                                ) : variance > 0.01 ? (
                                    <span><strong>Overpayment:</strong> {formatCurrency(variance)} excess credited towards principal.</span>
                                ) : (
                                    <span><strong>Full Scheduled Payment:</strong> Exact match for {selectedScheduleItem ? `Installment #${selectedScheduleItem.installment_no}` : 'calculated amount due'}.</span>
                                )}
                            </div>
                        </div>

                        {/* Total Payment Amount Banner */}
                        <div style={{
                            background: 'var(--bg-tertiary)',
                            borderRadius: '10px',
                            padding: '16px',
                            marginBottom: '20px',
                            textAlign: 'center',
                        }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Final Payment Amount</p>
                            <p style={{ margin: '4px 0 0', fontSize: '1.6rem', fontWeight: 800, color: isExceedingTotalLoan ? '#ef4444' : 'var(--accent-primary)' }}>
                                {formatCurrency(totalPayment)}
                            </p>
                        </div>

                        {/* Planned Repayment Schedule Section */}
                        {schedule.length > 0 && (
                            <div style={{
                                marginBottom: '20px',
                                background: 'var(--bg-tertiary)',
                                borderRadius: '12px',
                                border: '1px solid var(--border-secondary)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    padding: '12px 16px',
                                    background: 'var(--bg-secondary)',
                                    borderBottom: '1px solid var(--border-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <List size={16} style={{ color: 'var(--accent-primary)' }} />
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Planned Repayment Schedule</span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click or use action buttons to configure</span>
                                </div>
                                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                    <DataTable
                                        columns={[
                                            { key: 'installment_no', label: 'Inst.' },
                                            {
                                                key: 'due_date',
                                                label: 'Due Date',
                                                render: (val) => (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                                                        <span>{val}</span>
                                                    </div>
                                                )
                                            },
                                            {
                                                key: 'total_amount',
                                                label: 'Amount',
                                                render: (val) => <div style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(val)}</div>
                                            },
                                            {
                                                key: 'status',
                                                label: 'Status',
                                                render: (val) => (
                                                    <div style={{ textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '10px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                            textTransform: 'uppercase',
                                                            background:
                                                                val === 'paid' ? 'rgba(16, 185, 129, 0.15)' :
                                                                    val === 'overdue' ? 'rgba(239, 68, 68, 0.15)' :
                                                                        val === 'partial' ? 'rgba(245, 158, 11, 0.15)' :
                                                                            'rgba(107, 114, 128, 0.1)',
                                                            color:
                                                                val === 'paid' ? '#10b981' :
                                                                    val === 'overdue' ? '#ef4444' :
                                                                        val === 'partial' ? '#f59e0b' :
                                                                            'var(--text-muted)'
                                                        }}>
                                                            {val}
                                                        </span>
                                                    </div>
                                                )
                                            },
                                            {
                                                key: 'actions',
                                                label: 'Edit / Mode',
                                                render: (_: any, row: any) => {
                                                    const index = schedule.indexOf(row) !== -1
                                                        ? schedule.indexOf(row)
                                                        : schedule.findIndex((s: any) => (s.id && row.id && s.id === row.id) || (s.installment_no && row.installment_no && s.installment_no === row.installment_no));
                                                    if (row.status === 'paid') {
                                                        return <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Paid</div>;
                                                    }
                                                    const isSelected = selectedScheduleIndex === index;
                                                    return (
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSelectScheduleItem(row, index, 'both');
                                                                }}
                                                                style={{
                                                                    padding: '3px 7px',
                                                                    fontSize: '0.7rem',
                                                                    borderRadius: '5px',
                                                                    border: isSelected && paymentMode === 'both' ? '1px solid var(--accent-primary)' : '1px solid var(--border-secondary)',
                                                                    background: isSelected && paymentMode === 'both' ? 'var(--accent-bg)' : 'var(--bg-secondary)',
                                                                    color: isSelected && paymentMode === 'both' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                                    cursor: 'pointer',
                                                                    fontWeight: 600
                                                                }}
                                                                title="Pay both principal & interest"
                                                            >
                                                                Full
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSelectScheduleItem(row, index, 'interest_only');
                                                                }}
                                                                style={{
                                                                    padding: '3px 7px',
                                                                    fontSize: '0.7rem',
                                                                    borderRadius: '5px',
                                                                    border: isSelected && paymentMode === 'interest_only' ? '1px solid #f59e0b' : '1px solid var(--border-secondary)',
                                                                    background: isSelected && paymentMode === 'interest_only' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-secondary)',
                                                                    color: isSelected && paymentMode === 'interest_only' ? '#d97706' : 'var(--text-secondary)',
                                                                    cursor: 'pointer',
                                                                    fontWeight: 600
                                                                }}
                                                                title="Pay interest only"
                                                            >
                                                                Interest
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSelectScheduleItem(row, index, 'capital_only');
                                                                }}
                                                                style={{
                                                                    padding: '3px 7px',
                                                                    fontSize: '0.7rem',
                                                                    borderRadius: '5px',
                                                                    border: isSelected && paymentMode === 'capital_only' ? '1px solid #3b82f6' : '1px solid var(--border-secondary)',
                                                                    background: isSelected && paymentMode === 'capital_only' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-secondary)',
                                                                    color: isSelected && paymentMode === 'capital_only' ? '#2563eb' : 'var(--text-secondary)',
                                                                    cursor: 'pointer',
                                                                    fontWeight: 600
                                                                }}
                                                                title="Pay capital/principal only"
                                                            >
                                                                Capital
                                                            </button>
                                                        </div>
                                                    );
                                                }
                                            }
                                        ]}
                                        data={schedule}
                                        onRowClick={(row, index) => handleSelectScheduleItem(row, index, 'both')}
                                        selectedRowIndex={selectedScheduleIndex}
                                        emptyMessage="No schedule available"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                Notes (Optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add notes about this payment (e.g. Interest only payment, Bank ref)..."
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
                            disabled={
                                loading ||
                                totalPayment <= 0 ||
                                isExceedingTotalLoan ||
                                (schedule.length > 0 && selectedScheduleIndex === null && !loadingSchedule)
                            }
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '10px',
                                border: isExceedingTotalLoan ? '1px solid rgba(239, 68, 68, 0.4)' : 'none',
                                background: isExceedingTotalLoan
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : (schedule.length > 0 && selectedScheduleIndex === null && !loadingSchedule)
                                        ? 'var(--bg-tertiary)'
                                        : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                color: isExceedingTotalLoan
                                    ? '#ef4444'
                                    : (schedule.length > 0 && selectedScheduleIndex === null && !loadingSchedule) ? 'var(--text-muted)' : 'white',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: (loading || totalPayment <= 0 || isExceedingTotalLoan || (schedule.length > 0 && selectedScheduleIndex === null && !loadingSchedule)) ? 'not-allowed' : 'pointer',
                                opacity: (loading || totalPayment <= 0 || isExceedingTotalLoan) ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }}
                        >
                            {loading ? <MStreetLoader size={18} color="#ffffff" /> : isExceedingTotalLoan ? <AlertCircle size={18} /> : <Banknote size={18} />}
                            {loading
                                ? 'Processing...'
                                : isExceedingTotalLoan
                                    ? `Exceeds Total Remaining Loan Balance (${formatCurrency(totalRemainingPayoff)})`
                                    : (schedule.length > 0 && selectedScheduleIndex === null && !loadingSchedule)
                                        ? 'Select an Installment to Pay'
                                        : `Confirm ${paymentMode === 'interest_only' ? 'Interest-Only' : paymentMode === 'capital_only' ? 'Capital-Only' : isPartialPayment ? 'Partial' : 'Full'} Payment`}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
