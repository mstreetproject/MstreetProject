import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RepaymentTransaction } from '@/types/dashboard';

interface UseRepaymentMutationsProps {
    loan: any;
    schedule: any[];
    updateInstallmentStatus: (id: string, status: 'pending' | 'paid' | 'partial' | 'overdue') => Promise<void>;
    logActivity: (action: any, entityType: any, entityId: string, details: any) => Promise<void>;
    refetchRepaymentLoans?: () => void;
    setTransactions: (txs: RepaymentTransaction[]) => void;
    setSuccess: (success: boolean) => void;
    setError: (error: string | null) => void;
    setNotes: (notes: string) => void;
    setPrincipalAmount: (val: string) => void;
    setInterestAmount: (val: string) => void;
    setSelectedScheduleIndex: (idx: number | null) => void;
    formatCurrency: (amount: number) => string;
    isSuperAdmin: boolean;
}

export function useRepaymentMutations({
    loan,
    schedule,
    updateInstallmentStatus,
    logActivity,
    refetchRepaymentLoans,
    setTransactions,
    setSuccess,
    setError,
    setNotes,
    setPrincipalAmount,
    setInterestAmount,
    setSelectedScheduleIndex,
    formatCurrency,
    isSuperAdmin
}: UseRepaymentMutationsProps) {
    const [submitting, setSubmitting] = useState(false);

    const submitRepayment = async (
        principalAmount: string,
        interestAmount: string,
        paymentMode: string,
        notes: string,
        isFinalPhaseShortfall: boolean,
        calculations: any
    ) => {
        if (!loan) return;

        setError(null);
        setSuccess(false);
        setSubmitting(true);

        try {
            const principalPaid = parseFloat(principalAmount) || 0;
            const interestPaid = parseFloat(interestAmount) || 0;
            const actualTotal = principalPaid + interestPaid;

            if (principalPaid <= 0 && interestPaid <= 0) {
                throw new Error('Please enter a valid payment amount');
            }

            if (isFinalPhaseShortfall) {
                throw new Error(`Final payment of ${formatCurrency(actualTotal)} is insufficient. You must pay the remaining balance to close this loan.`);
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
                .from('repayment_transactions')
                .insert({
                    loan_id: loan.id,
                    principal_paid: principalPaid,
                    interest_paid: interestPaid,
                    payment_mode: paymentMode,
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
                        await updateInstallmentStatus(item.id, 'paid');
                        break; // Stop after applying remaining to the current item
                    }
                }
            }

            // 4. Log the activity
            await logActivity('RECORD_REPAYMENT' as any, 'loan', loan.id, {
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
            if (refetchRepaymentLoans) {
                refetchRepaymentLoans();
            }

            // Reload transactions
            const { data: newTransactions } = await supabase
                .from('repayment_transactions')
                .select(`*, recorder:recorded_by(full_name), reverter:reverted_by(full_name)`)
                .eq('loan_id', loan.id)
                .order('created_at', { ascending: false });
            if (newTransactions) setTransactions(newTransactions);
        } catch (err: any) {
            console.error('Repayment error:', err);
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const revertTransaction = async (tx: RepaymentTransaction) => {
        if (!isSuperAdmin) {
            alert('Only Super Admins can revert transactions.');
            return;
        }

        if (!confirm(`Are you sure you want to revert this payment of ${formatCurrency(tx.total_paid)}? This action cannot be undone.`)) {
            return;
        }

        try {
            setSubmitting(true);
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // 1. Update the transaction status
            const { error: txError } = await supabase
                .from('repayment_transactions')
                .update({ 
                    status: 'reverted',
                    reverted_by: user.id,
                    reverted_at: new Date().toISOString()
                })
                .eq('id', tx.id);

            if (txError) throw txError;

            // 2. Deduct from loan totals
            if (loan) {
                const newPrincipalRepaid = Math.max(0, (loan.amount_repaid || 0) - tx.principal_paid);
                const newInterestRepaid = Math.max(0, (loan.interest_repaid || 0) - tx.interest_paid);
                
                // If it was preliquidated, we need to set it back to performing if principal isn't fully paid
                const isFullyRepaid = Math.abs(newPrincipalRepaid - loan.principal) < 0.01;
                const newStatus = isFullyRepaid ? 'preliquidated' : (loan.status === 'preliquidated' ? 'performing' : loan.status);

                const { error: loanError } = await supabase
                    .from('loans')
                    .update({
                        amount_repaid: newPrincipalRepaid,
                        interest_repaid: newInterestRepaid,
                        status: newStatus
                    })
                    .eq('id', loan.id);
                
                if (loanError) throw loanError;

                // 3. Recalculate schedule statuses
                if (schedule.length > 0) {
                    let remainingPrincipal = newPrincipalRepaid;
                    let remainingInterest = newInterestRepaid;

                    const { data: cleanSchedule } = await supabase
                        .from('repayment_schedules')
                        .select('*')
                        .eq('loan_id', loan.id)
                        .order('installment_no', { ascending: true });

                    if (cleanSchedule) {
                        for (const item of cleanSchedule) {
                            let itemStatus = 'pending';
                            
                            if (remainingPrincipal >= item.principal_amount - 0.01 && remainingInterest >= item.interest_amount - 0.01) {
                                itemStatus = 'paid';
                                remainingPrincipal -= item.principal_amount;
                                remainingInterest -= item.interest_amount;
                            } else if (remainingPrincipal > 0 || remainingInterest > 0) {
                                itemStatus = 'paid';
                                remainingPrincipal -= item.principal_amount;
                                remainingInterest -= item.interest_amount;
                            }

                            if (item.status !== itemStatus) {
                                await supabase
                                    .from('repayment_schedules')
                                    .update({ status: itemStatus })
                                    .eq('id', item.id);
                            }
                        }
                    }
                }
            }

            // 4. Log the activity
            await logActivity('REVERT_REPAYMENT' as any, 'loan', loan.id, {
                transaction_id: tx.id,
                amount_principal_reverted: tx.principal_paid,
                amount_interest_reverted: tx.interest_paid,
                total_amount_reverted: tx.total_paid
            });

            setSuccess(true);
            
            if (refetchRepaymentLoans) {
                refetchRepaymentLoans();
            }

            const { data: newTransactions } = await supabase
                .from('repayment_transactions')
                .select(`*, recorder:recorded_by(full_name), reverter:reverted_by(full_name)`)
                .eq('loan_id', loan.id)
                .order('created_at', { ascending: false });
            if (newTransactions) setTransactions(newTransactions);

        } catch (err: any) {
            console.error('Revert error:', err);
            setError(err.message || 'Failed to revert transaction');
        } finally {
            setSubmitting(false);
        }
    };

    return {
        submitting,
        submitRepayment,
        revertTransaction
    };
}
