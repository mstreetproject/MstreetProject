'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import CreateCreditForm from '@/components/dashboard/CreateCreditForm';
import CreateCreditorModal from '@/components/dashboard/CreateCreditorModal';
import { useUser } from '@/hooks/dashboard/useUser';
import { UserPlus } from 'lucide-react';
import styles from '../../creditors/page.module.css';
import MStreetLoader from '@/components/ui/MStreetLoader';

export default function RecordCreditPage() {
    const { user, loading: userLoading } = useUser();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

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
                        <h1 className={styles.pageTitle}>Record Credit</h1>
                        <p className={styles.pageSubtitle}>Receive funds from creditors</p>
                    </div>
                    <div className={styles.headerRight}>
                        <button
                            className={styles.createBtn}
                            onClick={() => setShowCreateModal(true)}
                        >
                            <UserPlus size={20} />
                            <span>Add Creditor</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div style={{ marginTop: '24px' }}>
                    <CreateCreditForm key={refreshKey} />
                </div>
            </div>

            {/* Create Creditor Modal */}
            <CreateCreditorModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    setRefreshKey(prev => prev + 1);
                    setShowCreateModal(false);
                }}
            />
        </DashboardLayout>
    );
}
