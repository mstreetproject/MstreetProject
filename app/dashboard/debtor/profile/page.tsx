'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '@/hooks/dashboard/useUser';
import { createClient } from '@/lib/supabase/client';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Camera,
    Loader2,
    CheckCircle,
    Save
} from 'lucide-react';
import styles from '../../internal/creditors/page.module.css';

export default function ProfilePage() {
    const { user, refetch } = useUser();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        address: '',
    });

    // Populate form when user loads
    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                phone: user.phone || '',
                address: user.address || '',
            });
        }
    }, [user]);

    const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) throw new Error('Not authenticated');

            // Upload to storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${authUser.id}/profile.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('mstreetstorage')
                .upload(`profile-pictures/${fileName}`, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('mstreetstorage')
                .getPublicUrl(`profile-pictures/${fileName}`);

            // Update user record
            const { error: updateError } = await supabase
                .from('users')
                .update({ profile_picture_url: publicUrl })
                .eq('id', authUser.id);

            if (updateError) throw updateError;

            refetch?.();
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) throw new Error('Not authenticated');

            const { error: updateError } = await supabase
                .from('users')
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone,
                    address: formData.address,
                })
                .eq('id', authUser.id);

            if (updateError) throw updateError;

            refetch?.();
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    // Show loading state matching internal dashboard
    if (!user) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading profile...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.pageTitle}>My Profile</h1>
                    <p className={styles.pageSubtitle}>Manage your account information</p>
                </div>
            </div>

            {/* Profile Card - Centered and Responsive */}
            <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '16px',
                border: '1px solid var(--border-primary)',
                padding: '32px',
                maxWidth: '600px',
                margin: '0 auto', // Center the form
                width: '100%',
            }}>
                {/* Profile Picture */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginBottom: '32px',
                }}>
                    <div style={{
                        position: 'relative',
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        marginBottom: '16px',
                    }}>
                        {user?.profile_picture_url ? (
                            <img
                                src={user.profile_picture_url}
                                alt="Profile"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <User size={48} style={{ color: 'white' }} />
                        )}

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            style={{
                                position: 'absolute',
                                bottom: '0',
                                right: '0',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'var(--bg-secondary)',
                                border: '2px solid var(--border-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                            }}
                        >
                            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                        </button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureUpload}
                        style={{ display: 'none' }}
                    />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Click the camera icon to upload a new photo
                    </p>
                </div>

                {/* Success/Error Messages */}
                {success && (
                    <div style={{
                        background: 'var(--success-bg)',
                        color: 'var(--success)',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <CheckCircle size={18} />
                        Profile updated successfully!
                    </div>
                )}

                {error && (
                    <div style={{
                        background: 'var(--danger-bg)',
                        color: 'var(--danger)',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                    }}>
                        {error}
                    </div>
                )}

                {/* Profile Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                        }}>
                            <User size={16} />
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData(d => ({ ...d, full_name: e.target.value }))}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '1rem',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                        }}>
                            <Mail size={16} />
                            Email
                        </label>
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-secondary)',
                                color: 'var(--text-muted)',
                                fontSize: '1rem',
                                cursor: 'not-allowed',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                        }}>
                            <Phone size={16} />
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData(d => ({ ...d, phone: e.target.value }))}
                            placeholder="Enter your phone number"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '1rem',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                        }}>
                            <MapPin size={16} />
                            Address
                        </label>
                        <textarea
                            value={formData.address}
                            onChange={(e) => setFormData(d => ({ ...d, address: e.target.value }))}
                            placeholder="Enter your address"
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '1rem',
                                resize: 'vertical',
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '1rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                        }}
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
}
