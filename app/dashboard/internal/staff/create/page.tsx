'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useUser } from '@/hooks/dashboard/useUser';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './create.module.css';

export default function CreateStaffPage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        role: 'ops_officer',
    });

    // STRICT RBAC Guard - Only super_admin
    const isSuperAdmin = user?.roles?.some(role => role.name === 'super_admin');

    if (userLoading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!isSuperAdmin) {
        return (
            <div className={styles.error}>
                <h1>Access Denied</h1>
                <p>Only super administrators can create staff accounts.</p>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const supabase = createClient();

            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                // Update user to be internal
                const { error: updateError } = await supabase
                    .from('users')
                    .update({
                        is_internal: true,
                        phone: formData.phone,
                        full_name: formData.fullName
                    })
                    .eq('id', authData.user.id);

                if (updateError) throw updateError;

                // Assign role
                const { data: roleData } = await supabase
                    .from('roles')
                    .select('id')
                    .eq('name', formData.role)
                    .single();

                if (roleData) {
                    const { error: roleError } = await supabase
                        .from('user_roles')
                        .insert({
                            user_id: authData.user.id,
                            role_id: roleData.id
                        });

                    if (roleError) throw roleError;
                }

                setSuccess(true);
                setTimeout(() => {
                    router.push('/dashboard/internal/staff');
                }, 2000);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create staff account');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={styles.container}>
                <div className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>Create Staff Account</h1>
                    <p className={styles.pageSubtitle}>
                        Add a new internal staff member
                    </p>
                </div>

                <div className={styles.formCard}>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Full Name</label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                className={styles.input}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={styles.input}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Password</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className={styles.input}
                                required
                                minLength={6}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Role</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className={styles.select}
                                required
                            >
                                <option value="finance_manager">Finance Manager</option>
                                <option value="ops_officer">Operations Officer</option>
                                <option value="risk_officer">Risk Officer</option>
                                <option value="super_admin">Super Admin</option>
                            </select>
                        </div>

                        {error && (
                            <div className={styles.errorMessage}>{error}</div>
                        )}

                        {success && (
                            <div className={styles.successMessage}>
                                Staff account created successfully! Redirecting...
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={styles.submitBtn}
                        >
                            {loading ? 'Creating...' : 'Create Staff Account'}
                        </button>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
