'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import MStreetLoader from '@/components/ui/MStreetLoader';
import { createClient } from '@/lib/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useRepaymentSchedule } from '@/hooks/dashboard/useRepaymentSchedule';
import { Banknote, AlertCircle, CheckCircle, ToggleLeft, ToggleRight, Calculator, User, Search, List, Calendar } from 'lucide-react';
import styles from './CreateCreditForm.module.css';
import DataTable, { Column } from './DataTable';
import LoanDetailsModal from './LoanDetailsModal';
import PdfViewerModal from './PdfViewerModal';

interface Loan {
    id: string;
    debtor_id: string;
    principal: number;
    interest_rate: number;
    tenure_months: number;
    start_date: string;
    end_date: string;
    origination_date?: string;
    disbursed_date?: string;
    status: string;
    amount_repaid?: number;
    interest_repaid?: number;
    reference_no?: string;
    debtor?: {
        full_name: string;
        email: string;
    };
    created_at?: string;
    updated_at?: string;
    loan_documents?: {
        id: string;
        is_signed: boolean;
        signed_file_url?: string;
        file_url: string;
        file_name: string;
    }[];
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
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysElapsed = Math.max(0, (now.getTime() - start.getTime()) / msPerDay);

    // Simple interest on daily basis: P * (R/100) * (Days / 365)
    const totalInterest = principal * (interestRate / 100) * (daysElapsed / 365);
    return Math.max(0, totalInterest - interestAlreadyPaid);
}

export default function RecordRepaymentForm() {
    const { formatCurrency } = useCurrency();
    const { logActivity } = useActivityLog();

    const [loans, setLoans] = useState<Loan[]>([]);
    const [selectedLoanId, setSelectedLoanId] = useState<string>('');
    const [loadingLoans, setLoadingLoans] = useState(true);

    const [isPartialPayment, setIsPartialPayment] = useState(false);
    const [principalAmount, setPrincipalAmount] = useState('');
    const [interestAmount, setInterestAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [loanForDetails, setLoanForDetails] = useState<any>(null);
    const [viewingPdf, setViewingPdf] = useState<{ url: string, name: string } | null>(null);
    const [selectedScheduleIndex, setSelectedScheduleIndex] = useState<number | null>(null);

    const {
        schedule,
        loading: loadingSchedule,
        updateInstallmentStatus
    } = useRepaymentSchedule(selectedLoanId);

    // Reset success/error and selection when changing loan
    useEffect(() => {
        setSuccess(false);
        setError(null);
        setSelectedScheduleIndex(null);
        setPrincipalAmount('');
        setInterestAmount('');
    }, [selectedLoanId]);

    // Fetch active loans
    useEffect(() => {
        async function fetchLoans() {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('loans')
                    .select(`
                        *,
                        debtor:users!debtor_id (
                            full_name,
                            email
                        ),
                        loan_documents(id, is_signed, signed_file_url, file_url, file_name)
                    `)
                    .in('status', ['performing', 'non_performing', 'overdue', 'preliquidated', 'repaid'])
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setLoans(data || []);
            } catch (err) {
                console.error('Error fetching loans:', err);
            } finally {
                setLoadingLoans(false);
            }
        }
        fetchLoans();

        // Expose refetch for use after submission
        (window as any).refetchRepaymentLoans = fetchLoans;
    }, []);

    const loan = useMemo(() =>
        loans.find(l => l.id === selectedLoanId) || null
        , [loans, selectedLoanId]);

    const activeLoans = useMemo(() =>
        loans.filter(l => l.status !== 'preliquidated' && l.status !== 'repaid')
        , [loans]);

    const paidLoans = useMemo(() =>
        loans
            .filter(l => l.status === 'preliquidated' || l.status === 'repaid')
            .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
        , [loans]);

    const flattenedPaidLoans = useMemo(() => {
        return paidLoans.map(l => ({
            ...l,
            debtor_name: l.debtor?.full_name || 'N/A',
            debtor_email: l.debtor?.email || 'N/A',
            ref_no: l.reference_no || l.id.slice(0, 8),
            formatted_principal: formatCurrency(l.principal),
            formatted_repaid_date: new Date(l.updated_at || Date.now()).toLocaleDateString()
        }));
    }, [paidLoans, formatCurrency]);

    const repaidColumns: Column[] = [
        {
            key: 'debtor_name',
            label: 'Debtor',
            render: (val, row) => (
                <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{val}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.debtor_email}</div>
                </div>
            )
        },
        {
            key: 'ref_no',
            label: 'Ref #',
        },
        {
            key: 'principal',
            label: 'Principal',
            render: (val) => <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(val)}</span>
        },
        {
            key: 'formatted_repaid_date',
            label: 'Repaid On',
        },
        {
            key: 'status',
            label: 'Status',
            render: (val) => (
                <span style={{
                    fontSize: '0.7rem',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    textTransform: 'uppercase',
                    fontWeight: 700
                }}>Repaid</span>
            )
        }
    ];

    const filteredActiveLoans = useMemo(() => {
        if (!searchTerm) return activeLoans;
        const lowTerm = searchTerm.toLowerCase();
        return activeLoans.filter(l =>
            l.debtor?.full_name.toLowerCase().includes(lowTerm) ||
            l.debtor?.email.toLowerCase().includes(lowTerm) ||
            l.reference_no?.toLowerCase().includes(lowTerm) ||
            l.id.toLowerCase().includes(lowTerm)
        );
    }, [activeLoans, searchTerm]);

    // Calculate amounts due
    const calculations = useMemo(() => {
        if (!loan) return { principalDue: 0, interestDue: 0, totalDue: 0 };

        const principalDue = loan.principal - (loan.amount_repaid || 0);
        const interestDue = calculateInterestDue(
            loan.principal,
            loan.interest_rate,
            loan.origination_date || loan.start_date,
            loan.interest_repaid || 0
        );

        return {
            principalDue: Math.max(0, principalDue),
            interestDue: Math.max(0, interestDue),
            totalDue: Math.max(0, principalDue) + Math.max(0, interestDue)
        };
    }, [loan]);

    // Auto-fill amounts when loan selection or toggle changes
    useEffect(() => {
        if (loan) {
            if (!isPartialPayment) {
                setPrincipalAmount(calculations.principalDue.toFixed(2));
                setInterestAmount(calculations.interestDue.toFixed(2));
            }
        } else {
            setPrincipalAmount('');
            setInterestAmount('');
        }
    }, [loan, isPartialPayment, calculations]);

    const totalPayment = (parseFloat(principalAmount) || 0) + (parseFloat(interestAmount) || 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loan) return;

        setError(null);
        setSuccess(false);
        setSubmitting(true);

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
                        break; // Stop after first partial for simplicity
                    }
                }
            }

            // 4. Log the activity
            await logActivity('RECORD_REPAYMENT', 'loan', loan.id, {
                amount_principal: principalPaid,
                amount_interest: interestPaid,
                total_amount: principalPaid + interestPaid,
                payment_type: paymentType,
                is_fully_repaid: isPrincipalFullyRepaid,
                notes
            });

            setSuccess(true);
            setNotes('');
            setSelectedScheduleIndex(null); // Reset selection after successful payment
            setPrincipalAmount('');
            setInterestAmount('');

            // Refresh the loan list to update statuses and dropdown
            if ((window as any).refetchRepaymentLoans) {
                (window as any).refetchRepaymentLoans();
            }
        } catch (err: any) {
            console.error('Repayment error:', err);
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <h3 className={styles.formTitle}>Record Loan Repayment</h3>
            <p className={styles.formSubtitle}>Record principal and interest payments from debtors</p>

            {error && <div className={styles.errorMessage}>{error}</div>}
            {success && (
                <div className={styles.successMessage}>
                    <CheckCircle size={18} />
                    Repayment recorded successfully!
                </div>
            )}

            <div className={styles.formGrid}>
                {/* Loan Selection & Search */}
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.label}>
                        <Search size={16} />
                        Active Loans Search
                    </label>
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                        <input
                            type="text"
                            placeholder="Filter by name, email, or reference..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-secondary)',
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>

                    <label htmlFor="loan_id" className={styles.label} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Select Active Loan *
                    </label>
                    <select
                        id="loan_id"
                        value={selectedLoanId}
                        onChange={(e) => setSelectedLoanId(e.target.value)}
                        className={styles.select}
                        required
                        disabled={loadingLoans || submitting}
                    >
                        <option value="">
                            {loadingLoans ? 'Loading loans...' : filteredActiveLoans.length === 0 ? 'No active loans found' : 'Select an active loan...'}
                        </option>
                        {filteredActiveLoans.map(l => (
                            <option key={l.id} value={l.id}>
                                {l.debtor?.full_name} - {formatCurrency(l.principal)} (#{l.reference_no || l.id.slice(0, 8)})
                            </option>
                        ))}
                    </select>
                </div>

                {loan && (
                    <>
                        {/* Concrete Info for Paid Loans */}
                        {(loan.status === 'preliquidated' || loan.status === 'repaid') && (
                            <div style={{
                                gridColumn: '1 / -1',
                                padding: '12px 16px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: '#10b981',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: 600,
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                marginBottom: '10px'
                            }}>
                                <CheckCircle size={20} />
                                This loan has been fully repaid.
                            </div>
                        )}
                        {/* Amount Due Summary */}
                        <div style={{
                            gridColumn: '1 / -1',
                            background: loan?.id === selectedLoanId
                                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08))'
                                : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))',
                            borderRadius: '12px',
                            padding: '24px',
                            marginBottom: '10px',
                            border: loan?.id === selectedLoanId
                                ? '2px solid var(--accent-primary)'
                                : '1px solid var(--border-secondary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            boxShadow: loan?.id === selectedLoanId ? '0 4px 20px rgba(99, 102, 241, 0.1)' : 'none',
                            transition: 'all 0.2s ease'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calculator size={18} style={{ color: 'var(--accent-primary)' }} />
                                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>Selection Details</span>
                                    {loan.loan_documents?.some(d => d.is_signed) ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const signedDoc = loan.loan_documents?.find(d => d.is_signed);
                                                if (signedDoc) {
                                                    setViewingPdf({
                                                        url: signedDoc.signed_file_url || signedDoc.file_url,
                                                        name: signedDoc.file_name
                                                    });
                                                }
                                            }}
                                            style={{
                                                marginLeft: '8px',
                                                fontSize: '0.65rem',
                                                background: '#10b981',
                                                color: 'white',
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                border: 'none',
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                            title="Click to view signed document"
                                        >
                                            <CheckCircle size={10} />
                                            Signed Agreement
                                        </button>
                                    ) : (
                                        <span style={{
                                            marginLeft: '8px',
                                            fontSize: '0.65rem',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: '#ef4444',
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontWeight: 700,
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            textTransform: 'uppercase'
                                        }}>
                                            <AlertCircle size={10} />
                                            Awaiting Signature
                                        </span>
                                    )}
                                </div>
                                {(loan.status === 'preliquidated' || loan.status === 'repaid') && (
                                    <span style={{
                                        fontSize: '0.7rem',
                                        background: '#10b981',
                                        color: 'white',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        textTransform: 'uppercase'
                                    }}>Fully Paid</span>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Principal Due</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                        {formatCurrency(calculations.principalDue)}
                                    </p>
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Interest Accrued</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                        {formatCurrency(calculations.interestDue)}
                                    </p>
                                </div>
                                <div style={{ borderLeft: '1px solid var(--border-secondary)', paddingLeft: '20px' }}>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Payable</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 900, color: 'var(--success)' }}>
                                        {formatCurrency(calculations.totalDue)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Payment Mode */}
                        <div style={{
                            gridColumn: '1 / -1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '10px',
                            marginTop: '10px',
                            cursor: 'pointer',
                            border: '1px solid var(--border-secondary)'
                        }}
                            onClick={() => setIsPartialPayment(!isPartialPayment)}
                        >
                            <div>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {isPartialPayment ? 'Partial Payment' : 'Full Payment'}
                                </span>
                                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {isPartialPayment
                                        ? 'Recording a portion of the amount due'
                                        : 'Settling the entire outstanding balance'}
                                </p>
                            </div>
                            {isPartialPayment
                                ? <ToggleRight size={32} style={{ color: 'var(--accent-primary)' }} />
                                : <ToggleLeft size={32} style={{ color: 'var(--text-muted)' }} />
                            }
                        </div>

                        {/* Payment Inputs */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                <Banknote size={16} />
                                Principal Component *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={calculations.principalDue + 0.01}
                                value={principalAmount}
                                onChange={(e) => setPrincipalAmount(e.target.value)}
                                placeholder="0.00"
                                className={styles.input}
                                disabled={!isPartialPayment || submitting}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                <Percent size={16} />
                                Interest Component *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={interestAmount}
                                onChange={(e) => setInterestAmount(e.target.value)}
                                placeholder="0.00"
                                className={styles.input}
                                disabled={!isPartialPayment || submitting}
                                required
                            />
                        </div>

                        <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                            <label htmlFor="notes" className={styles.label}>
                                Notes (Optional)
                            </label>
                            <textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="E.g. Bank transfer ref, late fee notes..."
                                className={styles.input}
                                rows={2}
                                style={{ resize: 'vertical', minHeight: '60px' }}
                            />
                        </div>

                        {/* Total Summary */}
                        <div style={{
                            gridColumn: '1 / -1',
                            padding: '16px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '10px',
                            textAlign: 'center',
                            border: '1px solid var(--border-secondary)'
                        }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Final Payment Amount</p>
                            <p style={{ margin: '4px 0 0', fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                {formatCurrency(totalPayment)}
                            </p>
                        </div>

                        {/* Repayment Plan / Schedule Section */}
                        {schedule.length > 0 && (
                            <div style={{
                                gridColumn: '1 / -1',
                                marginTop: '10px',
                                background: 'var(--bg-secondary)',
                                borderRadius: '12px',
                                border: '1px solid var(--border-secondary)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    padding: '12px 16px',
                                    background: 'var(--bg-tertiary)',
                                    borderBottom: '1px solid var(--border-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <List size={16} style={{ color: 'var(--accent-primary)' }} />
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Planned Repayment Schedule</span>
                                </div>
                                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
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
                                            }
                                        ]}
                                        data={schedule}
                                        onRowClick={(row, index) => {
                                            if (row.status !== 'paid') {
                                                setPrincipalAmount(row.principal_amount.toString());
                                                setInterestAmount(row.interest_amount.toString());
                                                setIsPartialPayment(true);
                                                setSelectedScheduleIndex(index);
                                            }
                                        }}
                                        selectedRowIndex={selectedScheduleIndex}
                                        emptyMessage="No schedule available"
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className={styles.formFooter}>
                <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={
                        submitting ||
                        !loan ||
                        totalPayment <= 0 ||
                        loan.status === 'preliquidated' ||
                        loan.status === 'repaid' ||
                        (schedule.length > 0 && selectedScheduleIndex === null && !loadingSchedule)
                    }
                    style={{
                        height: '52px',
                        fontSize: '1.1rem',
                        background: (loan?.status === 'preliquidated' || loan?.status === 'repaid')
                            ? 'var(--bg-tertiary)'
                            : (schedule.length > 0 && selectedScheduleIndex === null && !loadingSchedule)
                                ? 'var(--bg-tertiary)'
                                : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        color: (loan?.status === 'preliquidated' || loan?.status === 'repaid' || (schedule.length > 0 && selectedScheduleIndex === null)) ? 'var(--text-muted)' : 'white'
                    }}
                >
                    {submitting ? <MStreetLoader size={20} color="#ffffff" /> : <Banknote size={20} />}
                    {submitting
                        ? 'Recording...'
                        : (loan?.status === 'preliquidated' || loan?.status === 'repaid')
                            ? 'Loan Fully Repaid'
                            : (schedule.length > 0 && selectedScheduleIndex === null && !loadingSchedule)
                                ? 'Select an Installment'
                                : schedule.length === 0 && !loadingSchedule
                                    ? 'Confirm Full Repayment'
                                    : `Confirm Payment Receipt`}
                </button>
            </div>

            {/* Paid Loans History Section */}
            {paidLoans.length > 0 && (
                <div style={{ marginTop: '40px', borderTop: '1px solid var(--border-secondary)', paddingTop: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <CheckCircle size={20} style={{ color: '#10b981' }} />
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Fully Repaid Loans</h4>
                    </div>

                    <DataTable
                        columns={repaidColumns}
                        data={flattenedPaidLoans}
                        loading={loadingLoans}
                        emptyMessage="No repaid loans found"
                        searchable
                        searchPlaceholder="Search repaid loans..."
                        searchKeys={['debtor_name', 'debtor_email', 'ref_no']}
                        paginated
                        defaultPageSize={5}
                        onRowClick={(row) => {
                            setLoanForDetails(row);
                            setShowDetailsModal(true);
                        }}
                    />
                </div>
            )}

            <LoanDetailsModal
                isOpen={showDetailsModal}
                loan={loanForDetails}
                onClose={() => {
                    setShowDetailsModal(false);
                    setLoanForDetails(null);
                }}
            />
            <PdfViewerModal
                isOpen={!!viewingPdf}
                pdfUrl={viewingPdf?.url || ''}
                title={viewingPdf?.name || 'Document'}
                onClose={() => setViewingPdf(null)}
            />
        </form>
    );
}

// Minimal missing icons
const Percent = ({ size, ...props }: any) => (
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
        <line x1="19" y1="5" x2="5" y2="19"></line>
        <circle cx="6.5" cy="6.5" r="2.5"></circle>
        <circle cx="17.5" cy="17.5" r="2.5"></circle>
    </svg>
);
