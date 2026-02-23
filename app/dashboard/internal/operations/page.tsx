'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import CreateCreditForm from '@/components/dashboard/CreateCreditForm';
import CreateLoanForm from '@/components/dashboard/CreateLoanForm';
import RecordRepaymentForm from '@/components/dashboard/RecordRepaymentForm';
import RecordInvestmentForm from '@/components/dashboard/RecordInvestmentForm';

import DocumentsManager from '@/components/dashboard/DocumentsManager';
import { useUser } from '@/hooks/dashboard/useUser';
import { Coins, CreditCard, Banknote, TrendingUp, FileText, List, X } from 'lucide-react';
import styles from '../creditors/page.module.css';
import opStyles from './page.module.css';
import Modal from '@/components/ui/Modal';

type TabType = 'credit' | 'loan' | 'repayment' | 'investment' | 'documents';

export default function OperationsPage() {
    const { user, loading: userLoading } = useUser();
    const [activeTab, setActiveTab] = useState<TabType>('credit');
    const [showInvestmentModal, setShowInvestmentModal] = useState(false);

    // Handle initial tab from URL
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'investment') {
            setShowInvestmentModal(true);
            setActiveTab('credit'); // Default to first tab in background
        } else if (tab) {
            setActiveTab(tab as TabType);
        }
    }, []);

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
        { id: 'credit' as TabType, label: 'Record Placement', icon: Coins, description: 'Receive funds from placement providers' },
        { id: 'loan' as TabType, label: 'Disburse Loan', icon: CreditCard, description: 'Disburse funds to accounts' },
        { id: 'repayment' as TabType, label: 'Repayments', icon: Banknote, description: 'Record loan repayments' },
        { id: 'investment' as TabType, label: 'Record Investment', icon: TrendingUp, description: 'Record investments made by MStreet in other companies' },
        { id: 'documents' as TabType, label: 'Documents', icon: FileText, description: 'Manage all documents' },
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
                                onClick={() => {
                                    if (tab.id === 'investment') {
                                        setShowInvestmentModal(true);
                                    } else {
                                        setActiveTab(tab.id as TabType);
                                    }
                                }}
                            >
                                <tab.icon size={20} />
                                <span className={opStyles.tabLabel}>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={opStyles.content}>
                    {activeTab === 'credit' && <CreateCreditForm />}
                    {activeTab === 'loan' && <CreateLoanForm />}
                    {activeTab === 'repayment' && <RecordRepaymentForm />}
                    {activeTab === 'documents' && <DocumentsManager />}
                </div>

                {/* Investment Modal */}
                <Modal
                    isOpen={showInvestmentModal}
                    onClose={() => setShowInvestmentModal(false)}
                    title="Record Company Investment"
                >
                    <RecordInvestmentForm onSuccess={() => setShowInvestmentModal(false)} />
                </Modal>
            </div>
        </DashboardLayout>
    );
}
