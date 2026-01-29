'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/dashboard/useUser';
import { useActivityLog } from '@/hooks/useActivityLog';
import styles from './CreateExpenseModal.module.css';

interface CreateExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateExpenseModal({ isOpen, onClose, onSuccess }: CreateExpenseModalProps) {
    const { user } = useUser();
    const { logActivity } = useActivityLog();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        expense_name: '',
        amount: '',
        expense_month: new Date().toISOString().split('T')[0], // Default to today
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (!formData.expense_name || !formData.amount || !formData.expense_month) {
                throw new Error('Please fill in all required fields');
            }

            const supabase = createClient();

            const { data: insertedData, error: insertError } = await supabase
                .from('operating_expenses')
                .insert({
                    expense_name: formData.expense_name,
                    amount: parseFloat(formData.amount),
                    expense_month: formData.expense_month,
                    created_by: user?.id,
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // Log the activity
            await logActivity('CREATE_EXPENSE', 'expense', insertedData?.id || '', {
                expense_name: formData.expense_name,
                amount: parseFloat(formData.amount),
                expense_month: formData.expense_month,
            });

            // Success
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                expense_name: '',
                amount: '',
                expense_month: new Date().toISOString().split('T')[0],
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create expense');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Record New Expense</h2>
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
                        {loading && <MStreetLoader size={18} color="#ffffff" />}
                        {loading ? 'Saving...' : 'Create Expense'}
                    </button>
                </div>
            </div>
        </div>
    );
}
