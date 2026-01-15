'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/dashboard/useUser';
import styles from './CreateCreditorModal.module.css';

interface CreateCreditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateCreditorModal({ isOpen, onClose, onSuccess }: CreateCreditorModalProps) {
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        address: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (!formData.fullName || !formData.email) {
                throw new Error('Full Name and Email are required');
            }

            const supabase = createClient();

            // Insert new user with is_creditor flag
            const { error: insertError } = await supabase
                .from('users')
                .insert({
                    full_name: formData.fullName,
                    email: formData.email,
                    phone: formData.phone || null,
                    address: formData.address || null,
                    is_creditor: true,
                    // Passwords and auth accounts are separate; 
                    // this creates the DB record first. 
                    // If auth link is needed later, they can sign up with this email.
                });

            if (insertError) throw insertError;

            // Success
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                fullName: '',
                email: '',
                phone: '',
                address: ''
            });
        } catch (err: any) {
            setError(err.message || 'Failed to create creditor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Add New Creditor</h2>
                        <p className={styles.subtitle}>Enter creditor details below</p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn} type="button">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label htmlFor="fullName" className={styles.label}>
                            Full Name *
                        </label>
                        <input
                            id="fullName"
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData(d => ({ ...d, fullName: e.target.value }))}
                            placeholder="e.g. John Doe"
                            className={styles.input}
                            autoFocus
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="email" className={styles.label}>
                            Email Address *
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(d => ({ ...d, email: e.target.value }))}
                            placeholder="e.g. john@example.com"
                            className={styles.input}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="phone" className={styles.label}>
                            Phone Number
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData(d => ({ ...d, phone: e.target.value }))}
                            placeholder="+1 234 567 8900"
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="address" className={styles.label}>
                            Address
                        </label>
                        <input
                            id="address"
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData(d => ({ ...d, address: e.target.value }))}
                            placeholder="City, Country"
                            className={styles.input}
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
                        {loading ? 'Creating...' : 'Create Creditor'}
                    </button>
                </div>
            </div>
        </div>
    );
}
