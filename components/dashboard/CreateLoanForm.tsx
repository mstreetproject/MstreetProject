'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/dashboard/useUser';
import { useActivityLog } from '@/hooks/useActivityLog';
import { User, DollarSign, Percent, Calendar, Clock, RefreshCcw } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import styles from './CreateCreditForm.module.css'; // Reuse same styles
import { calculateLoanDates, RepaymentCycle, LoanDates } from '@/lib/loan-utils';

interface Debtor {
    id: string;
    full_name: string;
    email: string;
}

interface CreateLoanFormProps {
    onSuccess?: () => void;
}

export default function CreateLoanForm({ onSuccess }: CreateLoanFormProps) {
    const { user } = useUser();
    const { logActivity } = useActivityLog();
    const [debtors, setDebtors] = useState<Debtor[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingDebtors, setLoadingDebtors] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        debtor_id: '',
        principal: '',
        interest_rate: '',
        tenure_months: '',
        origination_date: new Date().toISOString().split('T')[0],
        disbursed_date: new Date().toISOString().split('T')[0],
        repayment_cycle: 'monthly' as RepaymentCycle,
    });

    const [calculatedDates, setCalculatedDates] = useState<LoanDates | null>(null);

    // Update calculated dates whenever relevant fields change
    useEffect(() => {
        const result = calculateLoanDates(
            formData.origination_date,
            parseInt(formData.tenure_months),
            formData.repayment_cycle
        );
        setCalculatedDates(result);
    }, [formData.origination_date, formData.tenure_months, formData.repayment_cycle]);

    // Fetch debtors on mount
    useEffect(() => {
        async function fetchDebtors() {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('users')
                    .select('id, full_name, email')
                    .eq('is_debtor', true)
                    .order('full_name');

                if (error) throw error;
                setDebtors(data || []);
            } catch (err) {
                console.error('Error fetching debtors:', err);
            } finally {
                setLoadingDebtors(false);
            }
        }
        fetchDebtors();
    }, []);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setLoading(true);

        try {
            if (!formData.debtor_id || !formData.principal || !formData.interest_rate || !formData.tenure_months) {
                throw new Error('Please fill in all required fields');
            }

            const supabase = createClient();
            const tenure = parseInt(formData.tenure_months);

            if (!calculatedDates) {
                throw new Error('Could not calculate loan dates. Please check your inputs.');
            }

            const { data: insertedData, error: insertError } = await supabase
                .from('loans')
                .insert({
                    debtor_id: formData.debtor_id,
                    principal: parseFloat(formData.principal),
                    interest_rate: parseFloat(formData.interest_rate),
                    tenure_months: tenure,
                    start_date: formData.disbursed_date, // start_date is now synced with disbursed_date
                    end_date: calculatedDates.formattedMaturityDate,
                    origination_date: formData.origination_date,
                    disbursed_date: formData.disbursed_date,
                    first_repayment_date: calculatedDates.formattedFirstRepaymentDate,
                    repayment_cycle: formData.repayment_cycle,
                    status: 'performing',
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // Log the loan creation
            const selectedDebtor = debtors.find(d => d.id === formData.debtor_id);
            await logActivity('CREATE_LOAN', 'loan', insertedData?.id || '', {
                debtor_name: selectedDebtor?.full_name,
                principal: parseFloat(formData.principal),
                interest_rate: parseFloat(formData.interest_rate),
                tenure_months: tenure,
            });

            setSuccess(true);
            setFormData({
                debtor_id: '',
                principal: '',
                interest_rate: '',
                tenure_months: '',
                origination_date: new Date().toISOString().split('T')[0],
                disbursed_date: new Date().toISOString().split('T')[0],
                repayment_cycle: 'monthly' as RepaymentCycle,
            });
            onSuccess?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to disburse loan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <h3 className={styles.formTitle}>Disburse Loan</h3>
            <p className={styles.formSubtitle}>Record a loan disbursement to a debtor</p>

            {error && <div className={styles.errorMessage}>{error}</div>}
            {success && <div className={styles.successMessage}>Loan disbursed successfully!</div>}

            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="debtor_id" className={styles.label}>
                        <User size={16} />
                        Debtor *
                    </label>
                    <select
                        id="debtor_id"
                        value={formData.debtor_id}
                        onChange={(e) => setFormData(d => ({ ...d, debtor_id: e.target.value }))}
                        className={styles.select}
                        required
                        disabled={loadingDebtors}
                    >
                        <option value="">
                            {loadingDebtors ? 'Loading...' : 'Select a debtor'}
                        </option>
                        {debtors.map(d => (
                            <option key={d.id} value={d.id}>
                                {d.full_name} ({d.email})
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="principal" className={styles.label}>
                        <DollarSign size={16} />
                        Loan Amount *
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
                        <Percent size={16} />
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
                        placeholder="12.5"
                        className={styles.input}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="tenure_months" className={styles.label}>
                        <Clock size={16} />
                        Tenure (Months) *
                    </label>
                    <input
                        id="tenure_months"
                        type="number"
                        min="1"
                        value={formData.tenure_months}
                        onChange={(e) => setFormData(d => ({ ...d, tenure_months: e.target.value }))}
                        placeholder="6"
                        className={styles.input}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="origination_date" className={styles.label}>
                        <Calendar size={16} />
                        Origination Date *
                    </label>
                    <input
                        id="origination_date"
                        type="date"
                        value={formData.origination_date}
                        onChange={(e) => {
                            const newDate = e.target.value;
                            setFormData(d => ({
                                ...d,
                                origination_date: newDate,
                                // Sync disbursed_date if it was matching origination_date before
                                disbursed_date: d.disbursed_date === d.origination_date ? newDate : d.disbursed_date
                            }));
                        }}
                        className={styles.input}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="disbursed_date" className={styles.label}>
                        <Clock size={16} />
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
                        <RefreshCcw size={16} />
                        Repayment Cycle *
                    </label>
                    <select
                        id="repayment_cycle"
                        value={formData.repayment_cycle}
                        onChange={(e) => setFormData(d => ({ ...d, repayment_cycle: e.target.value as RepaymentCycle }))}
                        className={styles.select}
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

                {calculatedDates && (
                    <div className={styles.calculationPreview}>
                        <div className={styles.previewItem}>
                            <span className={styles.previewLabel}>1st Repayment</span>
                            <span className={styles.previewValue}>{calculatedDates.formattedFirstRepaymentDate}</span>
                        </div>
                        <div className={styles.previewDivider}></div>
                        <div className={styles.previewItem}>
                            <span className={styles.previewLabel}>Maturity Date</span>
                            <span className={styles.previewValue}>{calculatedDates.formattedMaturityDate}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.formFooter}>
                <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={loading || loadingDebtors}
                >
                    {loading && <MStreetLoader size={18} color="#ffffff" />}
                    {loading ? 'Processing...' : 'Disburse Loan'}
                </button>
            </div>
        </form>
    );
}
