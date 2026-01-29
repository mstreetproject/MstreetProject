'use client';

import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import { useActivityLog } from '@/hooks/useActivityLog';
import styles from './CreateCreditorModal.module.css'; // Reuse same styles

interface CreateDebtorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateDebtorModal({ isOpen, onClose, onSuccess }: CreateDebtorModalProps) {
    const { logActivity } = useActivityLog();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        address: ''
    });

    if (!isOpen) return null;

    const resetForm = () => {
        setFormData({
            fullName: '',
            email: '',
            password: '',
            phone: '',
            address: ''
        });
        setError(null);
        setSuccess(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            if (!formData.fullName || !formData.email) {
                throw new Error('Full Name and Email are required');
            }

            if (!formData.password || formData.password.length < 6) {
                throw new Error('Password is required (min. 6 characters)');
            }

            // Use admin API to create user with auth
            const apiPayload = {
                full_name: formData.fullName,
                email: formData.email,
                password: formData.password,
                phone: formData.phone || null,
                address: formData.address || null,
                is_internal: false,
                is_creditor: false,
                is_debtor: true
            };

            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiPayload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create debtor');
            }

            const responseData = await response.json();

            // Log the activity
            await logActivity('CREATE_USER', 'user', responseData.user?.id || '', {
                full_name: formData.fullName,
                email: formData.email,
                is_debtor: true,
            });

            setSuccess(`Debtor "${formData.fullName}" created successfully!`);

            // Auto close after success
            setTimeout(() => {
                resetForm();
                onSuccess();
                onClose();
            }, 1500);

        } catch (err: any) {
            setError(err.message || 'Failed to create debtor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Add New Debtor</h2>
                        <p className={styles.subtitle}>Create a new debtor account with login access</p>
                    </div>
                    <button onClick={handleClose} className={styles.closeBtn} type="button">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Success notification */}
                    {success && (
                        <div className={styles.successMessage}>
                            <CheckCircle size={18} />
                            {success}
                        </div>
                    )}

                    {/* Error notification */}
                    {error && (
                        <div className={styles.error}>
                            <AlertCircle size={18} />
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
                        <label htmlFor="password" className={styles.label}>
                            Password *
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData(d => ({ ...d, password: e.target.value }))}
                            placeholder="Min. 6 characters"
                            className={styles.input}
                            required
                            minLength={6}
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
                        onClick={handleClose}
                        className={styles.cancelBtn}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={styles.submitBtn}
                        disabled={loading || !!success}
                    >
                        {loading && <MStreetLoader size={18} color="#ffffff" />}
                        {loading ? 'Creating...' : 'Create Debtor'}
                    </button>
                </div>
            </div>
        </div>
    );
}
