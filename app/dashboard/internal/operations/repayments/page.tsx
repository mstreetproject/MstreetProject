'use client';

import React from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import RecordRepaymentForm from '@/components/dashboard/RecordRepaymentForm';
import { useUser } from '@/hooks/dashboard/useUser';
import styles from '../../creditors/page.module.css';
import MStreetLoader from '@/components/ui/MStreetLoader';

export default function RepaymentsPage() {
    const { user, loading: userLoading } = useUser();

    // RBAC Guard
    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'ops_officer'].includes(role.name)
    );

    if (userLoading) {
        return (
            <div className={styles.loading}>
                <MStreetLoader size={120} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Loading...
                </p>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className={styles.error}>
                <h1>Access Denied</h1>
                <p>You do not have permission to access this page.</p>
            </div>
        );
    }

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>Repayments</h1>
                        <p className={styles.pageSubtitle}>Record loan repayments from debtors</p>
                    </div>
                </div>

                {/* Content */}
                <div style={{ marginTop: '24px' }}>
                    <RecordRepaymentForm />
                </div>
            </div>
        </DashboardLayout>
    );
}
