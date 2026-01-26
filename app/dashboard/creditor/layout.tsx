'use client';

import React from 'react';
import CreditorDashboardLayout from '@/components/dashboard/CreditorDashboardLayout';
import { useUser } from '@/hooks/dashboard/useUser';

export default function CreditorDashboardLayoutPage({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useUser();

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                color: 'var(--text-muted)',
                gap: '16px',
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid var(--border-secondary)',
                    borderTopColor: 'var(--accent-primary)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <p>Loading...</p>
            </div>
        );
    }

    // Check if user is a creditor
    const isCreditor = user?.is_creditor;

    if (!isCreditor) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                gap: '12px',
            }}>
                <h1 style={{ color: 'var(--danger)', fontSize: '2rem' }}>Access Denied</h1>
                <p style={{ color: 'var(--text-muted)' }}>This portal is only available to creditors.</p>
            </div>
        );
    }

    return (
        <CreditorDashboardLayout
            currentUser={{
                full_name: user?.full_name || '',
                email: user?.email || '',
                profile_picture_url: user?.profile_picture_url ?? undefined,
            }}
        >
            {children}
        </CreditorDashboardLayout>
    );
}
