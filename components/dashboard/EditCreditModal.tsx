'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import { createClient } from '@/lib/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';
import styles from './CreateExpenseModal.module.css'; // Reuse same modal styles

interface Credit {
    id: string;
    creditor_id: string;
    principal: number;
    interest_rate: number;
    tenure_months: number;
    start_date: string;
    end_date: string;
    status: string;
    creditor?: {
        full_name: string;
        email: string;
    };
}

interface EditCreditModalProps {
    isOpen: boolean;
    credit: Credit | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditCreditModal({ isOpen, credit, onClose, onSuccess }: EditCreditModalProps) {
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

    // Populate form when credit changes
    useEffect(() => {
        if (credit) {
            setFormData({
                principal: credit.principal.toString(),
                interest_rate: credit.interest_rate.toString(),
                tenure_months: credit.tenure_months.toString(),
                start_date: credit.start_date,
                status: credit.status,
            });
        }
    }, [credit]);

    if (!isOpen || !credit) return null;

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
                .from('credits')
                .update({
                    principal: parseFloat(formData.principal),
                    interest_rate: parseFloat(formData.interest_rate),
                    tenure_months: tenure,
                    start_date: formData.start_date,
                    end_date: endDate,
                    status: formData.status,
                })
                .eq('id', credit.id);

            if (updateError) throw updateError;

            // Calculate changes
            const changes: Record<string, { from: any, to: any }> = {};

            // Check Principal
            if (parseFloat(formData.principal) !== credit.principal) {
                changes.principal = { from: credit.principal, to: parseFloat(formData.principal) };
            }
            // Check Rate
            if (parseFloat(formData.interest_rate) !== credit.interest_rate) {
                changes.interest_rate = { from: credit.interest_rate, to: parseFloat(formData.interest_rate) };
            }
            // Check Tenure
            if (tenure !== credit.tenure_months) {
                changes.tenure_months = { from: credit.tenure_months, to: tenure };
            }
            // Check Start Date
            if (formData.start_date !== credit.start_date) {
                changes.start_date = { from: credit.start_date, to: formData.start_date };
            }
            // Check Status
            if (formData.status !== credit.status) {
                changes.status = { from: credit.status, to: formData.status };
            }

            // Log activity only if there are changes
            if (Object.keys(changes).length > 0) {
                await logActivity('UPDATE_CREDIT', 'credit', credit.id, {
                    field_changes: changes
                });
            }

            // Success
            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update credit');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Edit Credit</h2>
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

                    {/* Creditor Info (read-only) */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Creditor</label>
                        <div className={styles.readOnly}>
                            {credit.creditor?.full_name || 'N/A'}
                            <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                                ({credit.creditor?.email})
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
                            Interest Rate (%) *
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
                            <option value="matured">Matured</option>
                            <option value="withdrawn">Withdrawn</option>
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
