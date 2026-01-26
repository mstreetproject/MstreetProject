'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/hooks/dashboard/useUser';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
    User,
    Mail,
    Phone,
    Shield,
    Calendar,
    Save,
    AlertTriangle,
    Trash2,
    CheckCircle,
    XCircle
} from 'lucide-react';
import styles from './page.module.css';
import MStreetLoader from '@/components/ui/MStreetLoader';

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

// Delete Account Modal
const DeleteAccountModal = ({
    onClose,
    onConfirm,
    loading
}: {
    onClose: () => void;
    onConfirm: () => void;
    loading: boolean;
}) => {
    const [confirmText, setConfirmText] = useState('');

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles.modalTitle}>Delete Account</h3>
                <p className={styles.modalDescription}>
                    This action is permanent and cannot be undone. All your data, including
                    transaction history, will be permanently deleted.
                </p>
                <div className={styles.modalWarning}>
                    <strong>Warning:</strong> If you have any active investments,
                    please contact support before deleting your account.
                </div>
                <label className={styles.label}>
                    Type <strong>DELETE</strong> to confirm
                </label>
                <input
                    type="text"
                    className={styles.modalInput}
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                />
                <div className={styles.modalButtons}>
                    <button
                        className={styles.buttonSecondary}
                        onClick={onClose}
                        style={{ flex: 1 }}
                    >
                        Cancel
                    </button>
                    <button
                        className={styles.buttonDanger}
                        onClick={onConfirm}
                        disabled={confirmText !== 'DELETE' || loading}
                        style={{ flex: 1 }}
                    >
                        <Trash2 size={18} />
                        {loading ? 'Deleting...' : 'Delete Account'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function ProfilePage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();

    // Form state
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Populate form when user data loads
    useEffect(() => {
        if (user) {
            setFullName(user.full_name || '');
            setPhone(user.phone || '');
        }
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('users')
                .update({
                    full_name: fullName,
                    phone: phone
                })
                .eq('id', user?.id);

            if (error) throw error;

            setSuccessMessage('Profile updated successfully!');
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to update profile');
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleting(true);
        setErrorMessage('');

        try {
            const supabase = createClient();

            // First delete user roles
            await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', user?.id);

            // Delete user from users table
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', user?.id);

            if (error) throw error;

            // Sign out user
            await supabase.auth.signOut();

            // Redirect to home
            router.push('/');
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to delete account');
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const [simulatedLoading, setSimulatedLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSimulatedLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    if (userLoading || simulatedLoading) {
        return (
            <div className={styles.loading}>
                <MStreetLoader size={120} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Loading profile...
                </p>
            </div>
        );
    }

    // Get user roles as a string
    const userRoles = user?.roles?.map(r => r.name.replace(/_/g, ' ')).join(', ') || 'User';

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Profile Settings</h1>
                <p className={styles.pageSubtitle}>
                    Manage your account information and preferences
                </p>
            </div>

            {successMessage && (
                <div className={styles.successMessage}>
                    <CheckCircle size={18} />
                    {successMessage}
                </div>
            )}

            {errorMessage && (
                <div className={styles.errorMessage}>
                    <XCircle size={18} />
                    {errorMessage}
                </div>
            )}

            <div className={styles.profileGrid}>
                {/* Account Info Section */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <User size={20} className={styles.sectionIcon} />
                        Account Information
                    </h2>

                    <div className={styles.infoCard}>
                        <div className={styles.infoIcon}>
                            <Mail size={22} />
                        </div>
                        <div className={styles.infoContent}>
                            <div className={styles.infoLabel}>Email Address</div>
                            <div className={styles.infoValue}>{user?.email}</div>
                        </div>
                    </div>

                    <div className={styles.infoCard}>
                        <div className={styles.infoIcon}>
                            <Shield size={22} />
                        </div>
                        <div className={styles.infoContent}>
                            <div className={styles.infoLabel}>Role</div>
                            <div className={styles.infoValue} style={{ textTransform: 'capitalize' }}>
                                {userRoles}
                            </div>
                        </div>
                    </div>

                    <div className={styles.infoCard}>
                        <div className={styles.infoIcon}>
                            <Calendar size={22} />
                        </div>
                        <div className={styles.infoContent}>
                            <div className={styles.infoLabel}>Member Since</div>
                            <div className={styles.infoValue}>
                                {user?.created_at ? formatDate(user.created_at) : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Update Contact Details Section */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <Phone size={20} className={styles.sectionIcon} />
                        Contact Details
                    </h2>

                    <form onSubmit={handleUpdateProfile}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Full Name</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Phone Number</label>
                            <input
                                type="tel"
                                className={styles.input}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Enter your phone number"
                            />
                        </div>

                        <div className={styles.buttonGroup}>
                            <button
                                type="submit"
                                className={styles.buttonPrimary}
                                disabled={updating}
                            >
                                <Save size={18} />
                                {updating ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Danger Zone */}
                <div className={styles.dangerZone}>
                    <h2 className={styles.dangerTitle}>
                        <AlertTriangle size={20} />
                        Danger Zone
                    </h2>
                    <p className={styles.dangerDescription}>
                        Once you delete your account, there is no going back. All your personal
                        data will be permanently removed from our servers. Please be certain
                        before proceeding.
                    </p>
                    <button
                        className={styles.buttonDanger}
                        onClick={() => setShowDeleteModal(true)}
                    >
                        <Trash2 size={18} />
                        Delete Account
                    </button>
                </div>
            </div>

            {showDeleteModal && (
                <DeleteAccountModal
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleDeleteAccount}
                    loading={deleting}
                />
            )}
        </div>
    );
}
