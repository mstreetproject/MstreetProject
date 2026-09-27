'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import MStreetLoader from '@/components/ui/MStreetLoader';
import { createClient } from '@/lib/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useRepaymentSchedule } from '@/hooks/dashboard/useRepaymentSchedule';
import { AlertCircle, Banknote, List } from 'lucide-react';
import styles from './CreateCreditForm.module.css';
import { RepaymentTransaction } from '@/types/dashboard';

import LoanDetailsModal from './LoanDetailsModal';
import PdfViewerModal from './PdfViewerModal';

// Extracted logic and components
import { useRepaymentCalculations } from '@/hooks/dashboard/useRepaymentCalculations';
import { useRepaymentMutations } from '@/hooks/dashboard/useRepaymentMutations';
import ActiveLoanSelector from './repayments/ActiveLoanSelector';
import PaymentInputs from './repayments/PaymentInputs';
import TransactionHistoryTable from './repayments/TransactionHistoryTable';
import PaidLoansHistoryTable from './repayments/PaidLoansHistoryTable';

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
    repayment_method?: 'interest_only' | 'capital_only' | 'both' | 'custom';
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

export default function RecordRepaymentForm() {
    const { formatCurrency } = useCurrency();
    const { logActivity } = useActivityLog();

    const [loans, setLoans] = useState<Loan[]>([]);
    const [selectedLoanId, setSelectedLoanId] = useState<string>('');
    const [loadingLoans, setLoadingLoans] = useState(true);

    const [isPartialPayment, setIsPartialPayment] = useState(false);

    // Transaction state
    const [transactions, setTransactions] = useState<RepaymentTransaction[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    // Get auth context to check super_admin role
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    useEffect(() => {
        const checkRole = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: userRole } = await supabase
                    .from('user_roles')
                    .select('roles(name)')
                    .eq('user_id', user.id)
                    .single();
                setIsSuperAdmin((userRole?.roles as any)?.name === 'super_admin');
            }
        };
        checkRole();
    }, []);

    const [paymentMode, setPaymentMode] = useState<'both' | 'interest_only' | 'capital_only' | 'custom'>('both');
    const [principalAmount, setPrincipalAmount] = useState('');
    const [interestAmount, setInterestAmount] = useState('');
    const [notes, setNotes] = useState('');
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

    // Apply payment mode presets to an item or default loan due
    const applyPaymentPreset = useCallback((mode: 'both' | 'interest_only' | 'capital_only' | 'custom', pDue: number, iDue: number) => {
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
    }, []);

    const handleSelectScheduleItem = (row: any, index: number, mode: 'both' | 'interest_only' | 'capital_only' | 'custom' = 'both') => {
        if (row.status === 'paid') return;
        setSelectedScheduleIndex(index);
        applyPaymentPreset(mode, row.principal_amount, row.interest_amount);
    };

    // Reset success/error and selection when changing loan
    useEffect(() => {
        setSuccess(false);
        setError(null);
        setSelectedScheduleIndex(null);
        setPaymentMode('both');
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

    // Load transactions when loan changes
    useEffect(() => {
        const loadTransactions = async () => {
            if (!loan) {
                setTransactions([]);
                return;
            }
            setLoadingTransactions(true);
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('repayment_transactions')
                    .select(`
                        *,
                        recorder:recorded_by(full_name),
                        reverter:reverted_by(full_name)
                    `)
                    .eq('loan_id', loan.id)
                    .order('created_at', { ascending: false });
                
                if (error) {
                    console.error('Error fetching transactions:', error);
                } else {
                    setTransactions(data || []);
                }
            } finally {
                setLoadingTransactions(false);
            }
        };

        loadTransactions();
    }, [loan?.id]);

    const activeLoans = useMemo(() =>
        loans.filter(l => l.status !== 'preliquidated' && l.status !== 'repaid')
        , [loans]);

    const paidLoans = useMemo(() =>
        loans
            .filter(l => l.status === 'preliquidated' || l.status === 'repaid')
            .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
        , [loans]);

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

    const {
        calculations,
        totalPayment,
        actualTotal,
        expectedTotal,
        expectedPrincipal,
        expectedInterest,
        actualPrincipal,
        actualInterest,
        totalRemainingPayoff,
        allItemsPaid,
        isFinalPhaseShortfall
    } = useRepaymentCalculations({
        loan,
        schedule,
        selectedScheduleIndex,
        principalAmount,
        interestAmount
    });

    const { submitting, submitRepayment, revertTransaction } = useRepaymentMutations({
        loan,
        schedule,
        updateInstallmentStatus,
        logActivity,
        refetchRepaymentLoans: (window as any).refetchRepaymentLoans,
        setTransactions,
        setSuccess,
        setError,
        setNotes,
        setPrincipalAmount,
        setInterestAmount,
        setSelectedScheduleIndex,
        formatCurrency,
        isSuperAdmin
    });

    const initializedLoanId = useRef<string | null>(null);

    // Auto-select first pending schedule item when loan selection or schedule changes
    useEffect(() => {
        if (loan && initializedLoanId.current !== loan.id) {
            const defaultMode = loan.repayment_method || 'both';

            if (schedule.length > 0) {
                const firstPendingIdx = schedule.findIndex(s => s.status !== 'paid');
                const targetIdx = firstPendingIdx !== -1 ? firstPendingIdx : 0;
                const item = schedule[targetIdx];
                if (item && item.status !== 'paid') {
                    setSelectedScheduleIndex(targetIdx);
                    applyPaymentPreset(defaultMode, item.principal_amount, item.interest_amount);
                    initializedLoanId.current = loan.id;
                    return;
                }
            }
            if (!isPartialPayment) {
                const defaultPrincipal = schedule.length > 0 ? (loan.principal / loan.tenure_months) : calculations.principalDue;
                applyPaymentPreset(defaultMode, defaultPrincipal, calculations.interestDue);
                initializedLoanId.current = loan.id;
            }
        } else if (!loan) {
            setPrincipalAmount('');
            setInterestAmount('');
            setSelectedScheduleIndex(null);
            initializedLoanId.current = null;
        }
    }, [loan, isPartialPayment, calculations, schedule, applyPaymentPreset]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitRepayment(
            principalAmount,
            interestAmount,
            paymentMode,
            notes,
            isFinalPhaseShortfall,
            calculations
        );
    };

    return (
        <form onSubmit={handleSubmit} className={styles.formContainer}>
            <div className={styles.formHeader}>
                <h3 className={styles.formTitle}>Record Loan Repayment</h3>
                <p className={styles.formSubtitle}>Log payments against active loans.</p>
            </div>

            {error && (
                <div className={styles.errorAlert} style={{ gridColumn: '1 / -1' }}>
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className={styles.successAlert} style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong>Repayment Recorded Successfully!</strong>
                        <span style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '4px' }}>
                            Schedule statuses have been updated.
                        </span>
                    </div>
                </div>
            )}

            <div className={styles.formGrid}>
                <ActiveLoanSelector
                    loans={loans}
                    filteredActiveLoans={filteredActiveLoans}
                    selectedLoanId={selectedLoanId}
                    setSelectedLoanId={setSelectedLoanId}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    loadingLoans={loadingLoans}
                    submitting={submitting}
                    formatCurrency={formatCurrency}
                    loan={loan}
                    calculations={calculations}
                    setViewingPdf={setViewingPdf}
                />

                {loan && (
                    <>
                        {loan.status !== 'preliquidated' && loan.status !== 'repaid' && (
                            <PaymentInputs
                                paymentMode={paymentMode}
                                setPaymentMode={setPaymentMode}
                                principalAmount={principalAmount}
                                setPrincipalAmount={setPrincipalAmount}
                                interestAmount={interestAmount}
                                setInterestAmount={setInterestAmount}
                                setIsPartialPayment={setIsPartialPayment}
                                submitting={submitting}
                                notes={notes}
                                setNotes={setNotes}
                                schedule={schedule}
                                selectedScheduleIndex={selectedScheduleIndex}
                                applyPaymentPreset={applyPaymentPreset}
                                handleSelectScheduleItem={handleSelectScheduleItem}
                                expectedPrincipal={expectedPrincipal}
                                expectedInterest={expectedInterest}
                                actualTotal={actualTotal}
                                expectedTotal={expectedTotal}
                                totalPayment={totalPayment}
                                totalRemainingPayoff={totalRemainingPayoff}
                                isFinalPhaseShortfall={isFinalPhaseShortfall}
                                actualPrincipal={actualPrincipal}
                                actualInterest={actualInterest}
                                formatCurrency={formatCurrency}
                                calculations={calculations}
                            />
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
                        isFinalPhaseShortfall ||
                        loan.status === 'preliquidated' ||
                        loan.status === 'repaid' ||
                        (schedule.length > 0 && selectedScheduleIndex === null && !allItemsPaid && !loadingSchedule)
                    }
                    style={{
                        height: '52px',
                        fontSize: '1.1rem',
                        border: isFinalPhaseShortfall ? '1px solid rgba(239, 68, 68, 0.4)' : 'none',
                        background: (loan?.status === 'preliquidated' || loan?.status === 'repaid')
                            ? 'var(--bg-tertiary)'
                            : isFinalPhaseShortfall
                                ? 'rgba(239, 68, 68, 0.15)'
                                : (schedule.length > 0 && selectedScheduleIndex === null && !allItemsPaid && !loadingSchedule)
                                    ? 'var(--bg-tertiary)'
                                    : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        color: (loan?.status === 'preliquidated' || loan?.status === 'repaid' || (schedule.length > 0 && selectedScheduleIndex === null && !allItemsPaid))
                            ? 'var(--text-muted)'
                            : isFinalPhaseShortfall
                                ? '#ef4444'
                                : 'white'
                    }}
                >
                    {submitting ? <MStreetLoader size={20} color="#ffffff" /> : isFinalPhaseShortfall ? <AlertCircle size={20} /> : <Banknote size={20} />}
                    {submitting
                        ? 'Recording...'
                        : (loan?.status === 'preliquidated' || loan?.status === 'repaid')
                            ? 'Loan Fully Repaid'
                            : isFinalPhaseShortfall
                                ? `Must Pay Remaining Balance (${formatCurrency(totalRemainingPayoff)})`
                                : (schedule.length > 0 && selectedScheduleIndex === null && !allItemsPaid && !loadingSchedule)
                                    ? 'Select an Installment'
                                    : schedule.length === 0 && !loadingSchedule
                                        ? 'Confirm Full Repayment'
                                        : `Confirm Payment Receipt`}
                </button>
            </div>

            <TransactionHistoryTable
                loan={loan}
                transactions={transactions}
                loadingTransactions={loadingTransactions}
                isSuperAdmin={isSuperAdmin}
                submitting={submitting}
                formatCurrency={formatCurrency}
                handleRevertTransaction={revertTransaction}
            />

            <PaidLoansHistoryTable
                paidLoans={paidLoans}
                formatCurrency={formatCurrency}
            />

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
