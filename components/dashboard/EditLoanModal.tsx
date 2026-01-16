'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';
import styles from './CreateExpenseModal.module.css'; // Reuse same modal styles

interface Loan {
    id: string;
    debtor_id: string;
    principal: number;
    interest_rate: number;
    tenure_months: number;
    start_date: string;
    end_date: string;
    status: string;
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
        start_date: '',
        status: 'active',
    });

    // Populate form when loan changes
    useEffect(() => {
        if (loan) {
            setFormData({
                principal: loan.principal.toString(),
                interest_rate: loan.interest_rate.toString(),
                tenure_months: loan.tenure_months.toString(),
                start_date: loan.start_date,
                status: loan.status,
            });
        }
    }, [loan]);

    if (!isOpen || !loan) return null;

    const calculateEndDate = (startDate: string, tenureMonths: number): string => {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + tenureMonths);
        return date.toISOString().split('T')[0];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (!formData.principal || !formData.interest_rate || !formData.tenure_months || !formData.start_date) {
                throw new Error('Please fill in all required fields');
            }

            const supabase = createClient();
            const tenure = parseInt(formData.tenure_months);
            const endDate = calculateEndDate(formData.start_date, tenure);

            const { error: updateError } = await supabase
                .from('loans')
                .update({
                    principal: parseFloat(formData.principal),
                    interest_rate: parseFloat(formData.interest_rate),
                    tenure_months: tenure,
                    start_date: formData.start_date,
                    end_date: endDate,
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
            // Check Start Date
            if (formData.start_date !== loan.start_date) {
                changes.start_date = { from: loan.start_date, to: formData.start_date };
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
                        <label htmlFor="start_date" className={styles.label}>
                            Start Date *
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
                            <option value="active">Active</option>
                            <option value="repaid">Repaid</option>
                            <option value="overdue">Overdue</option>
                            <option value="defaulted">Defaulted</option>
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
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
