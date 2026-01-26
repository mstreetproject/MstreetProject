'use client';

import React, { useState, useEffect } from 'react';
import { X, RefreshCcw, Calendar } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import { createClient } from '@/lib/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';
import styles from './CreateExpenseModal.module.css'; // Reuse same modal styles
import { calculateLoanDates, RepaymentCycle } from '@/lib/loan-utils';

interface Loan {
    id: string;
    debtor_id: string;
    principal: number;
    interest_rate: number;
    tenure_months: number;
    start_date: string;
    end_date: string;
    status: string;
    repayment_cycle?: string;
    origination_date?: string;
    disbursed_date?: string;
    first_repayment_date?: string;
    reference_no?: string;
    debtor?: {
        full_name: string;
        email: string;
    };
}

interface EditLoanModalProps {
    isOpen: boolean;
    loan: Loan | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditLoanModal({ isOpen, loan, onClose, onSuccess }: EditLoanModalProps) {
    const { logActivity } = useActivityLog();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        principal: '',
        interest_rate: '',
        tenure_months: '',
        origination_date: '',
        disbursed_date: '',
        repayment_cycle: '' as RepaymentCycle,
        status: 'active',
    });

    // Populate form when loan changes
    useEffect(() => {
        if (loan) {
            setFormData({
                principal: loan.principal.toString(),
                interest_rate: loan.interest_rate.toString(),
                tenure_months: loan.tenure_months.toString(),
                origination_date: loan.origination_date || loan.start_date,
                disbursed_date: loan.disbursed_date || loan.start_date,
                repayment_cycle: (loan.repayment_cycle || 'monthly') as RepaymentCycle,
                status: loan.status,
            });
        }
    }, [loan]);

    if (!isOpen || !loan) return null;


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (!formData.principal || !formData.interest_rate || !formData.tenure_months || !formData.origination_date) {
                throw new Error('Please fill in all required fields');
            }

            const supabase = createClient();
            const tenure = parseInt(formData.tenure_months);

            const calculated = calculateLoanDates(
                formData.origination_date,
                tenure,
                formData.repayment_cycle
            );

            if (!calculated) {
                throw new Error('Failed to calculate loan dates');
            }

            const { error: updateError } = await supabase
                .from('loans')
                .update({
                    principal: parseFloat(formData.principal),
                    interest_rate: parseFloat(formData.interest_rate),
                    tenure_months: tenure,
                    start_date: formData.disbursed_date,
                    origination_date: formData.origination_date,
                    disbursed_date: formData.disbursed_date,
                    end_date: calculated.formattedMaturityDate,
                    first_repayment_date: calculated.formattedFirstRepaymentDate,
                    repayment_cycle: formData.repayment_cycle,
                    status: formData.status,
                })
                .eq('id', loan.id);

            if (updateError) throw updateError;

            // Calculate changes
            const changes: Record<string, { from: any, to: any }> = {};

            // Check Principal
            if (parseFloat(formData.principal) !== loan.principal) {
                changes.principal = { from: loan.principal, to: parseFloat(formData.principal) };
            }
            // Check Rate
            if (parseFloat(formData.interest_rate) !== loan.interest_rate) {
                changes.interest_rate = { from: loan.interest_rate, to: parseFloat(formData.interest_rate) };
            }
            // Check Tenure
            if (tenure !== loan.tenure_months) {
                changes.tenure_months = { from: loan.tenure_months, to: tenure };
            }
            // Check Origination Date
            if (formData.origination_date !== (loan.origination_date || loan.start_date)) {
                changes.origination_date = { from: loan.origination_date || loan.start_date, to: formData.origination_date };
            }
            // Check Disbursement Date
            if (formData.disbursed_date !== (loan.disbursed_date || loan.start_date)) {
                changes.disbursed_date = { from: loan.disbursed_date || loan.start_date, to: formData.disbursed_date };
            }
            // Check Repayment Cycle
            if (formData.repayment_cycle !== loan.repayment_cycle) {
                changes.repayment_cycle = { from: loan.repayment_cycle, to: formData.repayment_cycle };
            }
            // Check Status
            if (formData.status !== loan.status) {
                changes.status = { from: loan.status, to: formData.status };
            }

            // Log activity only if there are changes
            if (Object.keys(changes).length > 0) {
                await logActivity('UPDATE_LOAN', 'loan', loan.id, {
                    field_changes: changes
                });
            }

            // Success
            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update loan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Edit Loan</h2>
                    <button onClick={onClose} className={styles.closeBtn} type="button">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.errorMessage}>
                            {error}
                        </div>
                    )}

                    {/* Debtor Info (read-only) */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Debtor</label>
                        <div className={styles.readOnly}>
                            {loan.debtor?.full_name || 'N/A'}
                            <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                                ({loan.debtor?.email})
                            </span>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="principal" className={styles.label}>
                            Principal Amount *
                        </label>
                        <input
                            id="principal"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.principal}
                            onChange={(e) => setFormData(d => ({ ...d, principal: e.target.value }))}
                            placeholder="0.00"
                            className={styles.input}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="interest_rate" className={styles.label}>
                            Interest Rate (% p.a.) *
                        </label>
                        <input
                            id="interest_rate"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={formData.interest_rate}
                            onChange={(e) => setFormData(d => ({ ...d, interest_rate: e.target.value }))}
                            placeholder="8.5"
                            className={styles.input}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="tenure_months" className={styles.label}>
                            Tenure (Months) *
                        </label>
                        <input
                            id="tenure_months"
                            type="number"
                            min="1"
                            value={formData.tenure_months}
                            onChange={(e) => setFormData(d => ({ ...d, tenure_months: e.target.value }))}
                            placeholder="12"
                            className={styles.input}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="origination_date" className={styles.label}>
                            Origination Date *
                        </label>
                        <input
                            id="origination_date"
                            type="date"
                            value={formData.origination_date}
                            onChange={(e) => setFormData(d => ({ ...d, origination_date: e.target.value }))}
                            className={styles.input}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="disbursed_date" className={styles.label}>
                            Disbursement Date *
                        </label>
                        <input
                            id="disbursed_date"
                            type="date"
                            value={formData.disbursed_date}
                            onChange={(e) => setFormData(d => ({ ...d, disbursed_date: e.target.value }))}
                            className={styles.input}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="repayment_cycle" className={styles.label}>
                            Repayment Cycle *
                        </label>
                        <select
                            id="repayment_cycle"
                            value={formData.repayment_cycle}
                            onChange={(e) => setFormData(d => ({ ...d, repayment_cycle: e.target.value as RepaymentCycle }))}
                            className={styles.input}
                            required
                        >
                            <option value="fortnightly">Fortnightly (2 weeks)</option>
                            <option value="monthly">Monthly</option>
                            <option value="bi_monthly">Bi-Monthly (2 months)</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="quadrimester">Quadrimester (4 months)</option>
                            <option value="semiannual">Semiannual (6 months)</option>
                            <option value="annually">Annually</option>
                            <option value="bullet">Bullet (At Maturity)</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="status" className={styles.label}>
                            Status
                        </label>
                        <select
                            id="status"
                            value={formData.status}
                            onChange={(e) => setFormData(d => ({ ...d, status: e.target.value }))}
                            className={styles.input}
                        >
                            <option value="performing">Performing -(Active)</option>
                            <option value="non_performing">Non-performing - (Overdue)</option>
                            <option value="full_provision">Non-performing - Full provision required</option>
                            <option value="preliquidated">Preliquidated - Closed (repaid)</option>
                        </select>
                    </div>
                </form>

                <div className={styles.footer}>
                    <button
                        type="button"
                        onClick={onClose}
                        className={styles.cancelBtn}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={styles.submitBtn}
                        disabled={loading}
                    >
                        {loading && <MStreetLoader size={18} color="#ffffff" />}
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
