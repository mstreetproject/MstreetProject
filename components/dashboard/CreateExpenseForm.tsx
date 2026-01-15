'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/dashboard/useUser';
import { Loader2, Receipt, DollarSign, Calendar } from 'lucide-react';
import styles from './CreateCreditForm.module.css'; // Reuse same styles

interface CreateExpenseFormProps {
    onSuccess?: () => void;
}

export default function CreateExpenseForm({ onSuccess }: CreateExpenseFormProps) {
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        expense_name: '',
        amount: '',
        expense_month: new Date().toISOString().split('T')[0],
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setLoading(true);

        try {
            if (!formData.expense_name || !formData.amount || !formData.expense_month) {
                throw new Error('Please fill in all required fields');
            }

            const supabase = createClient();

            const { error: insertError } = await supabase
                .from('operating_expenses')
                .insert({
                    expense_name: formData.expense_name,
                    amount: parseFloat(formData.amount),
                    expense_month: formData.expense_month,
                    created_by: user?.id,
                });

            if (insertError) throw insertError;

            setSuccess(true);
            setFormData({
                expense_name: '',
                amount: '',
                expense_month: new Date().toISOString().split('T')[0],
            });
            onSuccess?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to record expense');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <h3 className={styles.formTitle}>Record Expense</h3>
            <p className={styles.formSubtitle}>Record an operating expense</p>

            {error && <div className={styles.errorMessage}>{error}</div>}
            {success && <div className={styles.successMessage}>Expense recorded successfully!</div>}

            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="expense_name" className={styles.label}>
                        <Receipt size={16} />
                        Expense Name *
                    </label>
                    <input
                        id="expense_name"
                        type="text"
                        value={formData.expense_name}
                        onChange={(e) => setFormData(d => ({ ...d, expense_name: e.target.value }))}
                        placeholder="e.g. Office Rent, Utilities"
                        className={styles.input}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="amount" className={styles.label}>
                        <DollarSign size={16} />
                        Amount *
                    </label>
                    <input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.amount}
                        onChange={(e) => setFormData(d => ({ ...d, amount: e.target.value }))}
                        placeholder="0.00"
                        className={styles.input}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="expense_month" className={styles.label}>
                        <Calendar size={16} />
                        Expense Date *
                    </label>
                    <input
                        id="expense_month"
                        type="date"
                        value={formData.expense_month}
                        onChange={(e) => setFormData(d => ({ ...d, expense_month: e.target.value }))}
                        className={styles.input}
                        required
                    />
                </div>
            </div>

            <div className={styles.formFooter}>
                <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={loading}
                >
                    {loading && <Loader2 size={16} className={styles.spinner} />}
                    {loading ? 'Recording...' : 'Record Expense'}
                </button>
            </div>
        </form>
    );
}
