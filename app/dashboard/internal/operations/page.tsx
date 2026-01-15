'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import CreateCreditForm from '@/components/dashboard/CreateCreditForm';
import CreateLoanForm from '@/components/dashboard/CreateLoanForm';
import CreateExpenseForm from '@/components/dashboard/CreateExpenseForm';
import { useUser } from '@/hooks/dashboard/useUser';
import { Coins, CreditCard, Receipt, Settings } from 'lucide-react';
import styles from '../creditors/page.module.css';
import opStyles from './page.module.css';

type TabType = 'credit' | 'loan' | 'expense';

export default function OperationsPage() {
    const { user, loading: userLoading } = useUser();
    const [activeTab, setActiveTab] = useState<TabType>('credit');

    // RBAC Guard
    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'ops_officer'].includes(role.name)
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
                <p>You do not have permission to access operations.</p>
            </div>
        );
    }

    const tabs = [
        { id: 'credit' as TabType, label: 'Record Credit', icon: Coins, description: 'Receive funds from creditors' },
        { id: 'loan' as TabType, label: 'Disburse Loan', icon: CreditCard, description: 'Lend funds to debtors' },
        { id: 'expense' as TabType, label: 'Record Expense', icon: Receipt, description: 'Track operating expenses' },
    ];

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>Operations Center</h1>
                        <p className={styles.pageSubtitle}>Manage financial transactions</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className={opStyles.tabsContainer}>
                    <div className={opStyles.tabs}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`${opStyles.tab} ${activeTab === tab.id ? opStyles.tabActive : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <tab.icon size={20} />
                                <span className={opStyles.tabLabel}>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className={opStyles.content}>
                    {activeTab === 'credit' && <CreateCreditForm />}
                    {activeTab === 'loan' && <CreateLoanForm />}
                    {activeTab === 'expense' && <CreateExpenseForm />}
                </div>
            </div>
        </DashboardLayout>
    );
}
