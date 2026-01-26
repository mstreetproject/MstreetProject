'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import CreateLoanForm from '@/components/dashboard/CreateLoanForm';
import CreateDebtorModal from '@/components/dashboard/CreateDebtorModal';
import RepaymentTable from '@/components/dashboard/RepaymentTable';
import { useUser } from '@/hooks/dashboard/useUser';
import { UserPlus, Wallet, History } from 'lucide-react';
import styles from '../../creditors/page.module.css';
import MStreetLoader from '@/components/ui/MStreetLoader';

export default function DisburseLoanPage() {
    const { user, loading: userLoading } = useUser();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [activeTab, setActiveTab] = useState<'disburse' | 'repayments'>('disburse');

    // RBAC Guard
    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'ops_officer'].includes(role.name)
    );

    if (userLoading) {
        return (
            <div className={styles.loading}>
                <MStreetLoader size={120} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Loading operations...
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
                        <h1 className={styles.pageTitle}>Operations</h1>
                        <p className={styles.pageSubtitle}>
                            {activeTab === 'disburse'
                                ? 'Lend funds to debtors and manage new disbursements'
                                : 'Track and record loan repayments across all debtors'}
                        </p>
                    </div>
                    {activeTab === 'disburse' && (
                        <div className={styles.headerRight}>
                            <button
                                className={styles.createBtn}
                                onClick={() => setShowCreateModal(true)}
                            >
                                <UserPlus size={20} />
                                <span>Add Debtor</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '12px',
                    padding: '6px',
                    marginBottom: '32px',
                    marginTop: '12px',
                    border: '1px solid var(--border-secondary)',
                    overflowX: 'auto',
                    scrollbarWidth: 'none'
                }} className="tab-navigation-container">
                    {[
                        { id: 'disburse', label: 'Disburse Loan', icon: <Wallet size={18} /> },
                        { id: 'repayments', label: 'Repayments', icon: <History size={18} /> }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: activeTab === tab.id ? '0 4px 12px rgba(0, 0, 0, 0.1)' : 'none',
                                whiteSpace: 'nowrap',
                                minWidth: '140px'
                            }}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <style jsx>{`
                    .tab-navigation-container::-webkit-scrollbar {
                        display: none;
                    }
                    @media (max-width: 640px) {
                        .tab-navigation-container {
                            padding: 4px;
                            gap: 4px;
                        }
                        .tab-navigation-container button {
                            padding: 10px 8px;
                            font-size: 0.85rem;
                            gap: 6px;
                            min-width: 120px;
                        }
                    }
                `}</style>

                {/* Content */}
                <div style={{ marginTop: '0' }}>
                    {activeTab === 'disburse' ? (
                        <CreateLoanForm key={refreshKey} />
                    ) : (
                        <div className={styles.section}>
                            <RepaymentTable />
                        </div>
                    )}
                </div>
            </div>

            {/* Create Debtor Modal */}
            <CreateDebtorModal
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
