'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';
import styles from './CreateExpenseModal.module.css';

interface Expense {
    id: string;
    expense_name: string;
    amount: number;
    expense_month: string;
    created_by?: string;
}

interface EditExpenseModalProps {
    isOpen: boolean;
    expense: Expense | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditExpenseModal({ isOpen, expense, onClose, onSuccess }: EditExpenseModalProps) {
    const { logActivity } = useActivityLog();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        expense_name: '',
        amount: '',
        expense_month: '',
    });

    // Populate form when expense changes
    useEffect(() => {
        if (expense) {
            setFormData({
                expense_name: expense.expense_name,
                amount: expense.amount.toString(),
                expense_month: expense.expense_month,
            });
        }
    }, [expense]);

    if (!isOpen || !expense) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (!formData.expense_name || !formData.amount || !formData.expense_month) {
                throw new Error('Please fill in all required fields');
            }

            const supabase = createClient();

            const { error: updateError } = await supabase
                .from('operating_expenses')
                .update({
                    expense_name: formData.expense_name,
                    amount: parseFloat(formData.amount),
                    expense_month: formData.expense_month,
                })
                .eq('id', expense.id);

            if (updateError) throw updateError;

            // Log the activity with field changes
            const fieldChanges: Record<string, { from: any; to: any }> = {};
            if (expense.expense_name !== formData.expense_name) {
                fieldChanges.expense_name = { from: expense.expense_name, to: formData.expense_name };
            }
            if (expense.amount !== parseFloat(formData.amount)) {
                fieldChanges.amount = { from: expense.amount, to: parseFloat(formData.amount) };
            }
            if (expense.expense_month !== formData.expense_month) {
                fieldChanges.expense_month = { from: expense.expense_month, to: formData.expense_month };
            }

            await logActivity('UPDATE_EXPENSE', 'expense', expense.id, {
                field_changes: fieldChanges,
            });

            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update expense');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Edit Expense</h2>
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

                    <div className={styles.formGroup}>
                        <label htmlFor="expense_name" className={styles.label}>
                            Expense Name *
                        </label>
                        <input
                            id="expense_name"
                            type="text"
                            value={formData.expense_name}
                            onChange={(e) => setFormData(d => ({ ...d, expense_name: e.target.value }))}
                            placeholder="e.g. Office Rent, Server Costs"
                            className={styles.input}
                            autoFocus
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="amount" className={styles.label}>
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
                            Date *
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
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
