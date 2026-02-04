'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, CheckCircle, AlertCircle, Building2 } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import { useActivityLog } from '@/hooks/useActivityLog';
import styles from './CreateInvesteeModal.module.css';

interface CreateInvesteeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateInvesteeModal({ isOpen, onClose, onSuccess }: CreateInvesteeModalProps) {
    const { logActivity } = useActivityLog();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        industry: '',
        contact_person: '',
        email: '',
        phone: ''
    });

    if (!isOpen) return null;

    const resetForm = () => {
        setFormData({
            name: '',
            industry: '',
            contact_person: '',
            email: '',
            phone: ''
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
            if (!formData.name) {
                throw new Error('Company Name is required');
            }

            const supabase = createClient();

            const { data, error: insertError } = await supabase
                .from('investee_companies')
                .insert({
                    name: formData.name,
                    industry: formData.industry || null,
                    contact_person: formData.contact_person || null,
                    email: formData.email || null,
                    phone: formData.phone || null
                })
                .select()
                .single();

            if (insertError) {
                if (insertError.code === '23505') {
                    throw new Error('A company with this name already exists');
                }
                throw insertError;
            }

            // Log the activity
            await logActivity('CREATE_USER', 'system', data.id, {
                company_name: formData.name,
                action: 'created_investee_company'
            });

            setSuccess(`Company "${formData.name}" added successfully!`);

            // Auto close after success
            setTimeout(() => {
                resetForm();
                onSuccess();
                onClose();
            }, 1500);

        } catch (err: any) {
            setError(err.message || 'Failed to add investee company');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className={styles.iconContainer}>
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h2 className={styles.title}>Add Investee Company</h2>
                            <p className={styles.subtitle}>Create a new partner for outward investments</p>
                        </div>
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
                        <label htmlFor="name" className={styles.label}>
                            Company Name *
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(d => ({ ...d, name: e.target.value }))}
                            placeholder="e.g. Acme Corp"
                            className={styles.input}
                            autoFocus
                            required
                        />
                    </div>

                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label htmlFor="industry" className={styles.label}>
                                Industry
                            </label>
                            <input
                                id="industry"
                                type="text"
                                value={formData.industry}
                                onChange={(e) => setFormData(d => ({ ...d, industry: e.target.value }))}
                                placeholder="e.g. Technology"
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="contact_person" className={styles.label}>
                                Contact Person
                            </label>
                            <input
                                id="contact_person"
                                type="text"
                                value={formData.contact_person}
                                onChange={(e) => setFormData(d => ({ ...d, contact_person: e.target.value }))}
                                placeholder="e.g. John Smith"
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="email" className={styles.label}>
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(d => ({ ...d, email: e.target.value }))}
                                placeholder="e.g. contact@acme.com"
                                className={styles.input}
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
                                placeholder="e.g. +234..."
                                className={styles.input}
                            />
                        </div>
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
                        {loading ? 'Adding...' : 'Add Company'}
                    </button>
                </div>
            </div>
        </div>
    );
}
