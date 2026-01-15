'use client';

import React from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useUser } from '@/hooks/dashboard/useUser';
import { FileText, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import styles from '../creditors/page.module.css';

export default function ReportsPage() {
    const { user, loading: userLoading } = useUser();

    // RBAC Guard
    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'risk_officer'].includes(role.name)
    );

    if (userLoading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className={styles.error}>
                <h1>Access Denied</h1>
                <p>You do not have permission to view reports.</p>
            </div>
        );
    }

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={styles.container}>
                <div className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>Reports & Analytics</h1>
                    <p className={styles.pageSubtitle}>
                        Financial reports and performance analytics
                    </p>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Coming Soon</h2>
                    <p style={{ color: '#94A3B8', fontSize: '1rem' }}>
                        Financial reports and analytics features will be available here.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
