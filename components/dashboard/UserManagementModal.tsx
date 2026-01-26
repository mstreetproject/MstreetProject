'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Briefcase, DollarSign, TrendingUp } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import { createClient } from '@/lib/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';
import styles from './UserManagementModal.module.css';

interface UserManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    // user to edit (optional)
    initialData?: {
        id: string;
        full_name: string;
        email: string;
        phone?: string;
        address?: string;
        is_internal: boolean;
        is_creditor: boolean;
        is_debtor: boolean;
        role?: string; // e.g. 'super_admin'
    } | null;
}

// Available internal roles
const INTERNAL_ROLES = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'finance_manager', label: 'Finance Manager' },
    { value: 'ops_officer', label: 'Operations Officer' },
    { value: 'risk_officer', label: 'Risk Officer' }
];

export default function UserManagementModal({ isOpen, onClose, onSuccess, initialData }: UserManagementModalProps) {
    const { logActivity } = useActivityLog();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        is_internal: false,
        is_creditor: false,
        is_debtor: false,
        selectedRole: 'ops_officer'
    });

    // Load initial data if editing
    useEffect(() => {
        if (initialData) {
            setFormData({
                full_name: initialData.full_name || '',
                email: initialData.email || '',
                password: '',
                phone: initialData.phone || '',
                address: initialData.address || '',
                is_internal: initialData.is_internal || false,
                is_creditor: initialData.is_creditor || false,
                is_debtor: initialData.is_debtor || false,
                selectedRole: initialData.role || 'ops_officer'
            });
        } else {
            // Reset for new user
            setFormData({
                full_name: '',
                email: '',
                password: '',
                phone: '',
                address: '',
                is_internal: false,
                is_creditor: false,
                is_debtor: false,
                selectedRole: 'ops_officer'
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (!formData.full_name || !formData.email) {
                throw new Error('Name and Email are required');
            }

            if (!initialData && !formData.password) {
                throw new Error('Password is required for new users');
            }

            if (!formData.is_internal && !formData.is_creditor && !formData.is_debtor) {
                throw new Error('Please select at least one user type (Internal, Creditor, or Debtor)');
            }

            const supabase = createClient();
            let userId = initialData?.id;

            // 1. Upsert User in public.users
            const userPayload = {
                full_name: formData.full_name,
                email: formData.email,
                phone: formData.phone || null,
                address: formData.address || null,
                is_internal: formData.is_internal,
                is_creditor: formData.is_creditor,
                is_debtor: formData.is_debtor,
                // If new, it will generate ID. If editing, we need ID.
            };

            let returnedUser;

            if (userId) {
                // Update - CLIENT SIDE (RLS allows updating own profile, but ADMIN might need special handling?)
                // Actually, existing RLS allows admins to update users.
                const { data, error: updateError } = await supabase
                    .from('users')
                    .update(userPayload)
                    .eq('id', userId)
                    .select()
                    .single();

                if (updateError) throw updateError;
                returnedUser = data;

                // Handle Role (only if is_internal)
                if (formData.is_internal) {
                    const { data: roleData, error: roleError } = await supabase
                        .from('roles')
                        .select('id')
                        .eq('name', formData.selectedRole)
                        .single();
                    if (roleError) throw new Error(`Invalid role: ${formData.selectedRole}`);

                    // Delete existing
                    await supabase.from('user_roles').delete().eq('user_id', userId);
                    // Insert new
                    const { error: linkError } = await supabase.from('user_roles').insert({
                        user_id: userId,
                        role_id: roleData.id
                    });
                    if (linkError) throw linkError;
                } else {
                    await supabase.from('user_roles').delete().eq('user_id', userId);
                }

                // Log the user update
                await logActivity('UPDATE_USER', 'user', userId, {
                    full_name: formData.full_name,
                    is_internal: formData.is_internal,
                    is_creditor: formData.is_creditor,
                    is_debtor: formData.is_debtor,
                    role: formData.is_internal ? formData.selectedRole : null,
                });

                alert(`User "${formData.full_name}" updated successfully!`);

            } else {
                // Insert - SERVER SIDE (Admin API) to create Auth User

                // Prepare payload for API
                const apiPayload = {
                    ...userPayload,
                    password: formData.password,
                    role: formData.selectedRole
                };

                const response = await fetch('/api/admin/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(apiPayload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to create user');
                }

                const responseData = await response.json();

                // Log the user creation
                await logActivity('CREATE_USER', 'user', responseData.user?.id || '', {
                    full_name: formData.full_name,
                    email: formData.email,
                    is_internal: formData.is_internal,
                    is_creditor: formData.is_creditor,
                    is_debtor: formData.is_debtor,
                    role: formData.is_internal ? formData.selectedRole : null,
                });

                alert(`User "${formData.full_name}" created successfully!`);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('User save error:', err);
            setError(err.message || 'Failed to save user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>{initialData ? 'Edit User' : 'Create New User'}</h2>
                        <p className={styles.subtitle}>Manage user details and permissions</p>
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

                    {/* Section: Basic Info */}
                    <div className={styles.formGroup}>
                        <div className={styles.sectionLabel}>Basic Information</div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Full Name *</label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData(d => ({ ...d, full_name: e.target.value }))}
                                    className={styles.input}
                                    placeholder="Jane Doe"
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Email *</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(d => ({ ...d, email: e.target.value }))}
                                    className={styles.input}
                                    placeholder="jane@mstreet.com"
                                    required
                                    disabled={!!initialData} // Disable email edit for now to avoid auth sync issues
                                />
                            </div>
                        </div>

                        {!initialData && (
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Password *</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData(d => ({ ...d, password: e.target.value }))}
                                        className={styles.input}
                                        placeholder="Min. 6 characters"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>
                        )}

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Phone</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(d => ({ ...d, phone: e.target.value }))}
                                    className={styles.input}
                                    placeholder="+123..."
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Address</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData(d => ({ ...d, address: e.target.value }))}
                                    className={styles.input}
                                    placeholder="City, Country"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: User Types */}
                    <div className={styles.formGroup}>
                        <div className={styles.sectionLabel}>User Classification (Select all that apply)</div>
                        <div className={styles.checkboxGroup}>

                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={formData.is_internal}
                                    onChange={(e) => setFormData(d => ({ ...d, is_internal: e.target.checked }))}
                                    className={styles.checkbox}
                                />
                                <Briefcase size={18} className="text-blue-400" />
                                <span>Internal Staff</span>
                            </label>

                            {formData.is_internal && (
                                <div style={{ marginLeft: '32px', marginBottom: '8px' }}>
                                    <label className={styles.label} style={{ fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>
                                        Assign Role
                                    </label>
                                    <select
                                        value={formData.selectedRole}
                                        onChange={(e) => setFormData(d => ({ ...d, selectedRole: e.target.value }))}
                                        className={styles.select}
                                    >
                                        {INTERNAL_ROLES.map(role => (
                                            <option key={role.value} value={role.value}>
                                                {role.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={formData.is_creditor}
                                    onChange={(e) => setFormData(d => ({ ...d, is_creditor: e.target.checked }))}
                                    className={styles.checkbox}
                                />
                                <DollarSign size={18} className="text-green-400" />
                                <span>Creditor (Lender)</span>
                            </label>

                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={formData.is_debtor}
                                    onChange={(e) => setFormData(d => ({ ...d, is_debtor: e.target.checked }))}
                                    className={styles.checkbox}
                                />
                                <TrendingUp size={18} className="text-orange-400" />
                                <span>Debtor (Borrower)</span>
                            </label>
                        </div>
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
                        {loading ? 'Saving...' : 'Save User'}
                    </button>
                </div>
            </div>
        </div>
    );
}
