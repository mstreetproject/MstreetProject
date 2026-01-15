'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/dashboard/useUser';
import { Loader2, User, DollarSign, Percent, Calendar, Clock } from 'lucide-react';
import styles from './CreateCreditForm.module.css'; // Reuse same styles

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
        start_date: new Date().toISOString().split('T')[0],
    });

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

    const calculateEndDate = (startDate: string, tenureMonths: number): string => {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + tenureMonths);
        return date.toISOString().split('T')[0];
    };

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
            const endDate = calculateEndDate(formData.start_date, tenure);

            const { error: insertError } = await supabase
                .from('loans')
                .insert({
                    debtor_id: formData.debtor_id,
                    principal: parseFloat(formData.principal),
                    interest_rate: parseFloat(formData.interest_rate),
                    tenure_months: tenure,
                    start_date: formData.start_date,
                    end_date: endDate,
                    status: 'active',
                });

            if (insertError) throw insertError;

            setSuccess(true);
            setFormData({
                debtor_id: '',
                principal: '',
                interest_rate: '',
                tenure_months: '',
                start_date: new Date().toISOString().split('T')[0],
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
                    <label htmlFor="start_date" className={styles.label}>
                        <Calendar size={16} />
                        Disbursement Date *
                    </label>
                    <input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData(d => ({ ...d, start_date: e.target.value }))}
                        className={styles.input}
                        required
                    />
                </div>
            </div>

            <div className={styles.formFooter}>
                <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={loading || loadingDebtors}
                >
                    {loading && <Loader2 size={16} className={styles.spinner} />}
                    {loading ? 'Processing...' : 'Disburse Loan'}
                </button>
            </div>
        </form>
    );
}
